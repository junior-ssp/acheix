import { requireSuperAdmin } from "@/lib/admin-auth";
import { json } from "@/lib/http";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifySmtpConnection } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type ServiceState = "operational" | "degraded" | "offline";

type ServiceCheck = {
  name: string;
  status: ServiceState;
  checkedAt: string;
  responseMs: number | null;
  detail: string;
};

const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://acheix.com.br").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseAuthKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const storageBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "listing-photos";
const databaseLimitBytes = capacityLimitBytes("SUPABASE_DB_LIMIT_GB", "SUPABASE_DB_LIMIT_BYTES", 8);
const storageLimitBytes = capacityLimitBytes("SUPABASE_STORAGE_LIMIT_GB", "SUPABASE_STORAGE_LIMIT_BYTES", 100);

type CapacityStats = {
  databaseBytes: number;
  storageBytes: number;
  fileCount: number;
  imageCount: number;
  bucketCount: number;
  bucketNames: string[];
};

export async function GET() {
  const admin = await authenticateSuperAdmin();
  if (admin instanceof Response) return admin;
  const checkedAt = new Date().toISOString();
  const capacityStats = readCapacityStats(checkedAt);

  const [vercel, database, storage, auth, domain, api, messages, push, email, upload, asaas] = await Promise.all([
    checkVercel(checkedAt),
    checkDatabase(checkedAt, capacityStats),
    checkStorage(checkedAt, capacityStats),
    checkSupabaseAuth(checkedAt),
    checkDomain(checkedAt),
    checkApi(checkedAt),
    checkMessages(checkedAt),
    checkPush(checkedAt),
    checkEmail(checkedAt),
    checkUpload(checkedAt),
    checkAsaasPix(checkedAt)
  ]);

  const services = [vercel, database.service, storage.service, auth, domain.service, api, messages, push, email, upload, asaas];
  const alerts = buildAlerts({ services, database, storage, domain });
  const offlineCount = services.filter((item) => item.status === "offline").length;
  const degradedCount = services.filter((item) => item.status === "degraded").length;
  const healthPercent = Math.round(((services.length - offlineCount - degradedCount * 0.5) / services.length) * 100);

  if (offlineCount > 0) {
    await writeAuditLog({
      userId: admin.id,
      action: "admin.system_monitor.offline_detected",
      metadata: { offlineServices: services.filter((item) => item.status === "offline").map((item) => item.name), checkedAt }
    });
  }

  return Response.json({
    checkedAt,
    summary: {
      healthPercent,
      infrastructure: healthPercent >= 95 ? "operational" : healthPercent >= 75 ? "degraded" : "offline",
      database: capacityState(database.usagePercent),
      storage: capacityState(storage.usagePercent),
      domain: domain.service.status,
      deploy: vercel.status
    },
    services,
    database,
    storage,
    domain,
    deploy: {
      version: process.env.NEXT_PUBLIC_APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "v1.0.0",
      status: vercel.status,
      currentUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : appUrl,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
      lastDeployAt: process.env.VERCEL_DEPLOYED_AT || null,
      buildTime: process.env.VERCEL_BUILD_TIME || null
    },
    alerts
  }, { headers: { "cache-control": "no-store, no-cache, must-revalidate, max-age=0", pragma: "no-cache", expires: "0" } });
}

export async function HEAD() {
  const admin = await authenticateSuperAdmin();
  if (admin instanceof Response) return new Response(null, { status: admin.status });
  return new Response(null, { status: 200 });
}

async function authenticateSuperAdmin() {
  try {
    return await requireSuperAdmin();
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}

async function checkVercel(checkedAt: string): Promise<ServiceCheck> {
  const result = await timedFetch(appUrl, { method: "HEAD" });
  return service("Vercel", result.ok ? "operational" : "offline", checkedAt, result.ms, result.ok ? "Deploy respondendo" : result.error);
}

async function checkDatabase(checkedAt: string, statsPromise: Promise<CapacityStats>) {
  const start = Date.now();
  try {
    const stats = await statsPromise;
    const usedBytes = stats.databaseBytes;
    return {
      service: service("Supabase Database", "operational", checkedAt, Date.now() - start, "Tamanho real consultado"),
      available: true,
      totalBytes: databaseLimitBytes,
      usedBytes,
      freeBytes: Math.max(databaseLimitBytes - usedBytes, 0),
      usagePercent: usagePercent(usedBytes, databaseLimitBytes)
    };
  } catch (error) {
    await logMonitorError("database", error);
    return {
      service: service("Supabase Database", "degraded", checkedAt, Date.now() - start, "Métrica de uso indisponível"),
      available: false,
      totalBytes: databaseLimitBytes,
      usedBytes: null,
      freeBytes: null,
      usagePercent: null
    };
  }
}

async function checkStorage(checkedAt: string, statsPromise: Promise<CapacityStats>) {
  const start = Date.now();
  try {
    const stats = await statsPromise;
    const usedBytes = stats.storageBytes;
    return {
      service: service("Supabase Storage", "operational", checkedAt, Date.now() - start, `${stats.bucketCount} bucket(s) medido(s)`),
      available: true,
      totalBytes: storageLimitBytes,
      usedBytes,
      freeBytes: Math.max(storageLimitBytes - usedBytes, 0),
      usagePercent: usagePercent(usedBytes, storageLimitBytes),
      imageCount: stats.imageCount,
      fileCount: stats.fileCount,
      bucketCount: stats.bucketCount,
      bucketNames: stats.bucketNames
    };
  } catch (error) {
    await logMonitorError("storage", error);
    return {
      service: service("Supabase Storage", "degraded", checkedAt, Date.now() - start, "Uso do storage indisponível"),
      available: false,
      totalBytes: storageLimitBytes,
      usedBytes: null,
      freeBytes: null,
      usagePercent: null,
      imageCount: null,
      fileCount: null,
      bucketCount: null,
      bucketNames: []
    };
  }
}

async function checkSupabaseAuth(checkedAt: string): Promise<ServiceCheck> {
  if (!supabaseUrl) return service("Supabase Auth", "degraded", checkedAt, null, "Supabase URL não configurada");
  if (!supabaseAuthKey) return service("Supabase Auth", "degraded", checkedAt, null, "Chave Supabase não configurada para o monitor");
  const result = await timedFetch(`${supabaseUrl}/auth/v1/health`, {
    method: "GET",
    headers: { apikey: supabaseAuthKey, authorization: `Bearer ${supabaseAuthKey}` }
  });
  return service("Supabase Auth", result.ok ? "operational" : "degraded", checkedAt, result.ms, result.ok ? "Auth respondendo" : result.error);
}

async function checkDomain(checkedAt: string) {
  const root = await timedFetch("https://acheix.com.br", { method: "HEAD" });
  const www = await timedFetch("https://www.acheix.com.br", { method: "HEAD" });
  const sslExpiresAt = process.env.SSL_EXPIRES_AT || null;
  const domainExpiresAt = process.env.DOMAIN_EXPIRES_AT || null;
  const status: ServiceState = root.ok && www.ok ? "operational" : root.ok || www.ok ? "degraded" : "offline";
  return {
    service: service("Domínio acheix.com.br", status, checkedAt, root.ms, root.ok ? "DNS e SSL respondendo" : root.error),
    root: { status: root.ok ? "operational" : "offline", responseMs: root.ms },
    www: { status: www.ok ? "operational" : "offline", responseMs: www.ms },
    sslActive: root.ok || www.ok,
    sslExpiresAt,
    domainExpiresAt,
    sslDaysLeft: daysLeft(sslExpiresAt),
    domainDaysLeft: daysLeft(domainExpiresAt)
  };
}

async function checkApi(checkedAt: string): Promise<ServiceCheck> {
  const result = await timedFetch(`${appUrl}/api/plans`, { method: "GET" });
  return service("API Principal", result.ok ? "operational" : "offline", checkedAt, result.ms, result.ok ? "API respondendo" : result.error);
}

async function checkMessages(checkedAt: string): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    await countRows("ContactLead");
    return service("Sistema de Interesses", "operational", checkedAt, Date.now() - start, "Interesses acessíveis");
  } catch (error) {
    await logMonitorError("messages", error);
    return service("Sistema de Interesses", "offline", checkedAt, Date.now() - start, "Falha no módulo de interesses");
  }
}

async function checkPush(checkedAt: string): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    await countRows("PushToken", (query) => query.eq("active", true));
    return service("Push Notifications", "operational", checkedAt, Date.now() - start, "Fila de push acessível");
  } catch (error) {
    await logMonitorError("push", error);
    return service("Push Notifications", "degraded", checkedAt, Date.now() - start, "Push indisponível");
  }
}

async function checkEmail(checkedAt: string): Promise<ServiceCheck> {
  const start = Date.now();
  const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  if (!configured) return service("Serviço de E-mails", "degraded", checkedAt, Date.now() - start, "SMTP não configurado agora");
  try {
    await verifySmtpConnection();
    return service("Serviço de E-mails", "operational", checkedAt, Date.now() - start, "Conexão e autenticação SMTP confirmadas agora");
  } catch (error) {
    await logMonitorError("email", error);
    return service("Serviço de E-mails", "degraded", checkedAt, Date.now() - start, `SMTP indisponível agora: ${safeMonitorReason(error)}`);
  }
}

async function checkUpload(checkedAt: string): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const supabase = getSupabaseAdmin();
    const bucket = await supabase.storage.getBucket(storageBucket);
    if (bucket.error) throw bucket.error;
    return service("Upload de Imagens", "operational", checkedAt, Date.now() - start, "Bucket de upload pronto");
  } catch (error) {
    await logMonitorError("upload", error);
    return service("Upload de Imagens", "offline", checkedAt, Date.now() - start, "Upload indisponível");
  }
}

async function checkAsaasPix(checkedAt: string): Promise<ServiceCheck> {
  const start = Date.now();
  const apiKey = process.env.ASAAS_API_KEY;
  const baseUrl = (process.env.ASAAS_BASE_URL || "https://api.asaas.com").replace(/\/$/, "");
  const environment = baseUrl.includes("sandbox") ? "sandbox" : "produção";

  if (!apiKey) {
    return service("Asaas PIX", "offline", checkedAt, null, "ASAAS_API_KEY não configurada na Vercel");
  }

  try {
    const [accountStatus, pixKeys] = await Promise.all([
      asaasFetch(`${baseUrl}/v3/myAccount/status`, apiKey),
      asaasFetch(`${baseUrl}/v3/pix/addressKeys`, apiKey)
    ]);
    const statusValues = responseStatusValues(accountStatus.data);
    const accountApproved = statusValues.some((value) => ["APPROVED", "ACTIVE", "ENABLED"].includes(value));
    const accountPending = statusValues.some((value) => ["PENDING", "AWAITING", "WAITING", "ANALYSIS", "IN_ANALYSIS", "PENDING_DOCUMENTS"].includes(value));
    const pixKeyCount = Array.isArray(pixKeys.data?.data)
      ? pixKeys.data.data.length
      : Array.isArray(pixKeys.data)
        ? pixKeys.data.length
        : 0;

    if (!accountStatus.ok) {
      return service("Asaas PIX", "degraded", checkedAt, Date.now() - start, `Asaas ${environment}: status da conta indisponível (${accountStatus.detail})`);
    }
    if (!pixKeys.ok) {
      return service("Asaas PIX", "degraded", checkedAt, Date.now() - start, `Asaas ${environment}: não foi possível consultar chaves PIX (${pixKeys.detail})`);
    }
    if (accountPending) {
      return service("Asaas PIX", "degraded", checkedAt, Date.now() - start, `Asaas ${environment}: API consultada agora e conta ainda indica análise/pendência cadastral`);
    }
    if (pixKeyCount <= 0) {
      return service("Asaas PIX", "degraded", checkedAt, Date.now() - start, `Asaas ${environment}: nenhuma chave PIX retornada pela API`);
    }

    const detail = accountApproved
      ? `Asaas ${environment}: conta aprovada e ${pixKeyCount} chave(s) PIX encontrada(s)`
      : `Asaas ${environment}: API respondeu e ${pixKeyCount} chave(s) PIX encontrada(s), mas aprovação não ficou explícita`;
    return service("Asaas PIX", accountApproved ? "operational" : "degraded", checkedAt, Date.now() - start, detail);
  } catch (error) {
    await logMonitorError("asaas_pix", error);
    return service("Asaas PIX", "offline", checkedAt, Date.now() - start, error instanceof Error ? error.message : "Falha ao consultar Asaas");
  }
}

async function asaasFetch(url: string, apiKey: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      access_token: apiKey
    },
    cache: "no-store"
  });
  const data = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    data,
    detail: response.ok ? "OK" : `HTTP ${response.status}`
  };
}

async function timedFetch(url: string, init: RequestInit) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    return { ok: response.ok, ms: Date.now() - start, error: response.ok ? "OK" : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, ms: Date.now() - start, error: error instanceof Error ? error.message : "Falha na conexão" };
  } finally {
    clearTimeout(timeout);
  }
}

function service(name: string, status: ServiceState, checkedAt: string, responseMs: number | null, detail: string): ServiceCheck {
  return { name, status, checkedAt, responseMs, detail };
}

function responseStatusValues(input: unknown): string[] {
  if (typeof input === "string") return [input.trim().toUpperCase()];
  if (Array.isArray(input)) return input.flatMap(responseStatusValues);
  if (input && typeof input === "object") return Object.values(input as Record<string, unknown>).flatMap(responseStatusValues);
  return [];
}

function safeMonitorReason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 160);
}

function buildAlerts(input: { services: ServiceCheck[]; database: any; storage: any; domain: any }) {
  const alerts: Array<{ level: ServiceState; title: string; message: string }> = [];
  for (const serviceItem of input.services) {
    if (serviceItem.status === "offline") alerts.push({ level: "offline", title: serviceItem.name, message: "Serviço offline." });
  }
  if (input.database.usagePercent !== null && input.database.usagePercent >= 80) alerts.push({ level: input.database.usagePercent > 90 ? "offline" : "degraded", title: "Banco de Dados", message: "Uso acima de 80%." });
  if (input.storage.usagePercent !== null && input.storage.usagePercent >= 80) alerts.push({ level: input.storage.usagePercent > 90 ? "offline" : "degraded", title: "Storage", message: "Uso acima de 80%." });
  if (input.domain.sslDaysLeft !== null && input.domain.sslDaysLeft <= 30) alerts.push({ level: "degraded", title: "SSL", message: `Certificado vence em ${input.domain.sslDaysLeft} dias.` });
  if (input.domain.domainDaysLeft !== null && input.domain.domainDaysLeft <= 30) alerts.push({ level: "degraded", title: "Domínio", message: `Domínio vence em ${input.domain.domainDaysLeft} dias.` });
  return alerts;
}

async function readCapacityStats(checkedAt: string): Promise<CapacityStats> {
  const startedAt = Date.now();
  try {
    const { data, error } = await getSupabaseAdmin().rpc("admin_system_capacity_stats");
    if (error) throw error;
    const raw = data as Partial<CapacityStats> | null;
    const stats: CapacityStats = {
      databaseBytes: safeNonNegativeNumber(raw?.databaseBytes),
      storageBytes: safeNonNegativeNumber(raw?.storageBytes),
      fileCount: safeNonNegativeNumber(raw?.fileCount),
      imageCount: safeNonNegativeNumber(raw?.imageCount),
      bucketCount: safeNonNegativeNumber(raw?.bucketCount),
      bucketNames: Array.isArray(raw?.bucketNames) ? raw.bucketNames.filter((name): name is string => typeof name === "string") : []
    };
    console.info("[admin-system-capacity]", { checkedAt, status: "success", responseMs: Date.now() - startedAt, fileCount: stats.fileCount, bucketCount: stats.bucketCount });
    return stats;
  } catch (error) {
    console.error("[admin-system-capacity]", { checkedAt, status: "failure", responseMs: Date.now() - startedAt, reason: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

function safeNonNegativeNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error("Supabase retornou uma métrica de capacidade inválida.");
  return number;
}

function usagePercent(usedBytes: number, totalBytes: number) {
  return Math.min(Number(((usedBytes / totalBytes) * 100).toFixed(2)), 100);
}

function capacityState(percent: number | null): ServiceState {
  if (percent === null) return "degraded";
  return percent <= 70 ? "operational" : percent <= 90 ? "degraded" : "offline";
}

function capacityLimitBytes(gigabytesEnv: string, bytesEnv: string, fallbackGigabytes: number) {
  const gigabytes = Number(process.env[gigabytesEnv]);
  if (Number.isFinite(gigabytes) && gigabytes > 0) return gigabytes * 1024 ** 3;
  const bytes = Number(process.env[bytesEnv]);
  if (Number.isFinite(bytes) && bytes > 0) return bytes;
  return fallbackGigabytes * 1024 ** 3;
}

function daysLeft(value: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.ceil((time - Date.now()) / 86400000);
}

async function countRows(table: string, apply?: (query: any) => any) {
  let query = db().from(table).select("id", { count: "exact", head: true });
  if (apply) query = apply(query);
  const { count, error } = await query;
  throwDbError(error);
  return count ?? 0;
}

async function writeAuditLog(input: { userId?: string | null; action: string; metadata: Record<string, unknown> }) {
  try {
    await db().from("AuditLog").insert({ id: newDbId(), ...input });
  } catch {
    // Monitoramento não pode falhar por causa de auditoria.
  }
}

async function logMonitorError(area: string, error: unknown) {
  await writeAuditLog({
    action: "admin.system_monitor.error",
    metadata: { area, message: error instanceof Error ? error.message : String(error) }
  });
}
