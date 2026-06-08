import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { cep: string } }) {
  const cep = params.cep.replace(/\D/g, "");
  if (cep.length !== 8) return json({ error: "CEP invalido" }, 422);

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    next: { revalidate: 86400 }
  });
  const data = await response.json();

  if (!response.ok || data.erro) return json({ error: "CEP não encontrado" }, 404);

  return json({
    cep: data.cep,
    address: data.logradouro,
    complement: data.complemento,
    district: data.bairro,
    city: data.localidade,
    state: data.uf,
    ibge: data.ibge,
    ddd: data.ddd
  });
}

