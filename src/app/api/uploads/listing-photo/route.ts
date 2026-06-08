import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const maxFileSize = 10 * 1024 * 1024;

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
    if (!(file instanceof File)) return json({ error: "Arquivo invalido." }, 422);
    if (!file.type.startsWith("image/")) return json({ error: "Envie apenas imagens." }, 422);
    if (file.size > maxFileSize) return json({ error: "Imagem maior que 10 MB." }, 422);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
    const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `listings/${user.id}/${Date.now()}-${crypto.randomUUID()}-${cleanName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false
    });

    if (error) return json({ error: error.message }, 400);

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return json({ url: data.publicUrl });
  } catch (error) {
    return errorResponse(error);
  }
}

