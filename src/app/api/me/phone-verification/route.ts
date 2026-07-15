import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { onlyDigits } from "@/lib/formatters";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { errorResponse, json } from "@/lib/http";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const verificationSchema = z.object({
  idToken: z.string().min(20),
  kind: z.enum(["phone", "whatsapp"]),
  phoneNumber: z.string().min(10)
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const data = verificationSchema.parse(await request.json());
    const firebaseAuth = getFirebaseAdminAuth();
    if (!firebaseAuth) return json({ error: "Firebase Admin não está configurado para verificar telefone." }, 500);

    const decoded = await firebaseAuth.verifyIdToken(data.idToken);
    const firebasePhone = normalizeBrazilPhone(decoded.phone_number);
    const requestedPhone = normalizeBrazilPhone(data.phoneNumber);
    if (!firebasePhone || firebasePhone !== requestedPhone) {
      return json({ error: "O telefone confirmado no Firebase não confere com o número informado." }, 422);
    }

    const now = new Date().toISOString();
    const patch = data.kind === "whatsapp"
      ? {
          whatsapp: requestedPhone,
          whatsappVerifiedAt: now,
          verificationProvider: "firebase_phone",
          updatedAt: now
        }
      : {
          phone: requestedPhone,
          phoneVerifiedAt: now,
          verificationProvider: "firebase_phone",
          updatedAt: now
        };

    const { data: updated, error } = await db()
      .from("User")
      .update(patch)
      .eq("id", user.id)
      .select("id,phone,whatsapp,phoneVerifiedAt,whatsappVerifiedAt,verificationProvider")
      .single();
    throwDbError(error);

    const { error: auditError } = await db().from("AuditLog").insert({
      id: newDbId(),
      userId: user.id,
      action: data.kind === "whatsapp" ? "user.whatsapp_verified" : "user.phone_verified",
      metadata: {
        provider: "firebase_phone",
        kind: data.kind,
        firebaseUid: decoded.uid,
        phoneSuffix: requestedPhone.slice(-4),
        verifiedAt: now
      }
    });
    throwDbError(auditError);

    return json({ user: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

function normalizeBrazilPhone(value: string | null | undefined) {
  const digits = onlyDigits(value);
  if (digits.length === 13 && digits.startsWith("55")) return digits.slice(2);
  if (digits.length === 12 && digits.startsWith("55")) return digits.slice(2);
  if (digits.length === 11) return digits;
  return "";
}
