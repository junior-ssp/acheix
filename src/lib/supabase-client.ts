"use client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "listing-photos";
const maxOriginalImageBytes = 30 * 1024 * 1024;
const uploadTargetBytes = Math.floor(3.5 * 1024 * 1024);
const maxImageDimension = 2560;

export function isSupabaseStorageConfigured() {
  return Boolean(supabaseUrl && bucket);
}

type UploadListingPhotoOptions = {
  manualListingOcr?: boolean;
  originProof?: boolean;
};

export async function uploadListingPhoto(file: File, options: UploadListingPhotoOptions = {}) {
  const uploadFile = await prepareListingPhoto(file);
  const response = await uploadWithRetry(uploadFile, options);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.url || !data?.moderationToken) {
    if (response.status === 401) {
      throw new Error("Entre ou crie uma conta para enviar fotos.");
    }
    throw new Error(data?.error ?? "Não foi possível enviar a foto.");
  }
  return { url: data.url as string, moderationToken: data.moderationToken as string, manualListingHints: data.manualListingHints };
}

async function uploadWithRetry(file: File, options: UploadListingPhotoOptions) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const formData = new FormData();
    formData.append("file", file);
    if (options.manualListingOcr) formData.append("manualListingOcr", "true");
    if (options.originProof) formData.append("originProof", "true");
    try {
      const response = await fetch("/api/uploads/listing-photo", { method: "POST", body: formData });
      if (response.status < 500 || attempt === 2) return response;
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 700 * (attempt + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error("Não foi possível enviar a foto.");
}

async function prepareListingPhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Envie apenas imagens.");
  if (file.size > maxOriginalImageBytes) throw new Error("A imagem original deve ter no máximo 30 MB.");
  if (file.size <= uploadTargetBytes) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    let width = bitmap.width;
    let height = bitmap.height;
    const initialScale = Math.min(1, maxImageDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * initialScale));
    height = Math.max(1, Math.round(height * initialScale));

    for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Não foi possível preparar a imagem.");
      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of [0.86, 0.76, 0.66, 0.56]) {
        const blob = await canvasToBlob(canvas, "image/jpeg", quality);
        if (blob.size <= uploadTargetBytes) {
          const baseName = file.name.replace(/\.[^.]+$/, "") || "imagem";
          return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
        }
      }

      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }
  } catch {
    throw new Error("Esta imagem é muito grande ou está em um formato incompatível. Escolha uma imagem de até 30 MB em JPG, PNG ou WebP.");
  } finally {
    bitmap?.close();
  }

  throw new Error("Não foi possível reduzir a imagem com segurança. Escolha outra foto.");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("image_compression_failed")), type, quality);
  });
}

