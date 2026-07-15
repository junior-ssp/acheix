import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const maxFileSize = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.REPORT_EVIDENCE_BUCKET || "report-evidence";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Upload não configurado no servidor." }, 500);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return json({ error: "Arquivo inválido." }, 422);
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return json({ error: "Envie imagem ou vídeo." }, 422);
    }
    if (file.size > maxFileSize) return json({ error: "Arquivo maior que 25 MB." }, 422);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
    const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `report-evidence/${user.id}/${Date.now()}-${crypto.randomUUID()}-${cleanName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "86400",
      contentType: file.type,
      upsert: false
    });

    if (error) return json({ error: error.message }, 400);

    const privateReference = `supabase-private://report-evidence/${encodeURIComponent(path)}`;
    return json({ url: privateReference });
  } catch (error) {
    return errorResponse(error);
  }
}
