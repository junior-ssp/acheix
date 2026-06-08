import { citiesByState } from "@/lib/constants";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

type IbgeCity = {
  nome?: string;
};

export async function GET(_: Request, { params }: { params: { state: string } }) {
  const state = params.state.toUpperCase();
  const fallback = citiesByState[state] ?? [];

  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios`, {
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 24 * 30 }
    });

    if (!response.ok) return json({ cities: fallback });

    const data = (await response.json()) as IbgeCity[];
    const cities = data.map((city) => city.nome).filter((name): name is string => Boolean(name)).sort((a, b) => a.localeCompare(b, "pt-BR"));

    return json({ cities: cities.length ? cities : fallback });
  } catch {
    return json({ cities: fallback });
  }
}
