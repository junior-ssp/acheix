"use client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "listing-photos";

export function isSupabaseStorageConfigured() {
  return Boolean(supabaseUrl && bucket);
}

export async function uploadListingPhoto(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads/listing-photo", {
    method: "POST",
    body: formData
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.url || !data?.moderationToken) {
    if (response.status === 401) {
      throw new Error("Entre ou crie uma conta para enviar fotos.");
    }
    throw new Error(data?.error ?? "Não foi possível enviar a foto.");
  }
  return { url: data.url as string, moderationToken: data.moderationToken as string };
}

