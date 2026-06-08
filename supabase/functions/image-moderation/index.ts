// Supabase Edge Function: image-moderation
// Configure VISION_MODERATION_ENDPOINT and VISION_MODERATION_API_KEY in Supabase secrets.

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void;
  env: { get(name: string): string | undefined };
};

type Finding = {
  category: string;
  confidence: number;
  label?: string;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const body = await request.json().catch(() => null);
  if (!body?.imageBase64 || !body?.mimeType) {
    return json({ status: "NEEDS_REVIEW", findings: [], ocrText: "", provider: "edge-invalid-payload" }, 200);
  }

  const endpoint = Deno.env.get("VISION_MODERATION_ENDPOINT");
  const apiKey = Deno.env.get("VISION_MODERATION_API_KEY");
  if (!endpoint || !apiKey) {
    return json({ status: "NEEDS_REVIEW", findings: [], ocrText: "", provider: "edge-not-configured" }, 200);
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        imageBase64: body.imageBase64,
        mimeType: body.mimeType,
        fileName: body.fileName,
        sha256: body.sha256,
        requireOcr: true,
        policy: body.policy
      })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return json({ status: "NEEDS_REVIEW", findings: [], ocrText: "", provider: "edge-provider-error", raw: { status: response.status, data } }, 200);
    }

    return json(normalizeProviderPayload(data), 200);
  } catch (error) {
    return json({ status: "NEEDS_REVIEW", findings: [], ocrText: "", provider: "edge-provider-failed", raw: { error: error instanceof Error ? error.message : "unknown" } }, 200);
  }
});

function normalizeProviderPayload(data: any) {
  const status = String(data?.status ?? data?.decision ?? "NEEDS_REVIEW").toUpperCase();
  const findings = normalizeFindings([...(data?.findings ?? []), ...(data?.categories ?? [])]);
  return {
    status,
    findings,
    ocrText: String(data?.ocrText ?? data?.text ?? ""),
    provider: data?.provider ?? "edge-provider",
    raw: data
  };
}

function normalizeFindings(values: any[]): Finding[] {
  return values
    .map((item) => ({
      category: String(item?.category ?? item?.label ?? "other"),
      confidence: normalizeConfidence(item?.confidence ?? item?.score ?? 0),
      label: item?.label ? String(item.label) : undefined
    }))
    .filter((item) => item.confidence > 0);
}

function normalizeConfidence(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number > 1 ? Math.min(1, number / 100) : Math.max(0, Math.min(1, number));
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}
