import { validateCpfWithProviders } from "@/lib/cpf-validation";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { cpf: string } }) {
  const result = await validateCpfWithProviders(params.cpf);
  if (!result.valid) return json(result, 422);
  return json(result);
}
