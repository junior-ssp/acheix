import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { blockedImageMessage, createImageModerationToken, finalizeApprovedImageModeration, moderateListingImage } from "@/lib/image-moderation";
import { extractManualListingOcrHints } from "@/lib/manual-listing-ocr";
import { canManageManualListings } from "@/lib/manual-listings";
import { inspectListingImage } from "@/lib/listing-image-validation";

export const dynamic = "force-dynamic";

// Keep the multipart request safely below the hosting function body limit.
// Larger originals are reduced in the browser before reaching this route.
const maxFileSize = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "listing-photos";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Supabase Storage não configurado no servidor." }, 500);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const shouldExtractManualListingHints = formData.get("manualListingOcr") === "true" && canManageManualListings(user);
    const originProof = formData.get("originProof") === "true";
    if (!(file instanceof File)) return json({ error: "Arquivo inválido." }, 422);
    if (!file.type.startsWith("image/")) return json({ error: "Envie apenas imagens." }, 422);
    if (file.size > maxFileSize) return json({ error: "Não foi possível reduzir a imagem antes do envio. Selecione-a novamente." }, 422);

    const bytes = Buffer.from(await file.arrayBuffer());
    const inspected = await inspectListingImage(bytes).catch(() => ({ error: "A imagem está corrompida, é incompatível ou não corresponde a um formato seguro." }));
    if ("error" in inspected) return json({ error: inspected.error }, 422);
    const moderation = await moderateListingImage({
      user,
      fileName: file.name,
      mimeType: file.type,
      bytes,
      originProof,
      request
    });

    if (moderation.status !== "APPROVED") {
      return json({ error: blockedImageMessage }, 422);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
    const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `listings/${user.id}/${Date.now()}-${crypto.randomUUID()}-${cleanName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      cacheControl: "31536000",
      contentType: inspected.mimeType,
      upsert: false
    });

    if (error) return json({ error: error.message }, 400);

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    await finalizeApprovedImageModeration({ userId: user.id, moderationId: moderation.moderationId, url: data.publicUrl, storagePath: path, hash: moderation.hash });

    return json({
      url: data.publicUrl,
      moderationToken: createImageModerationToken({ userId: user.id, url: data.publicUrl, hash: moderation.hash, moderationId: moderation.moderationId }),
      media: { width: inspected.width, height: inspected.height, mimeType: inspected.mimeType, orientation: inspected.orientation },
      manualListingHints: shouldExtractManualListingHints ? extractManualListingOcrHints(moderation.ocrText) : undefined
    });
  } catch (error) {
    return errorResponse(error);
  }
}
