import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPaymentRows, parseFinanceRange } from "@/lib/admin-finance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const range = parseFinanceRange(request.nextUrl.searchParams.get("start") ?? undefined, request.nextUrl.searchParams.get("end") ?? undefined);
  const rows = await getPaymentRows(range.start, range.end);
  const fileName = `financeiro-achei-x-${range.startInput}-a-${range.endInput}.csv`;
  const csv = toCsv([
    ["Data", "Usuário", "E-mail", "Tipo", "Valor", "Status", "Provedor", "Referência", "Anúncios", "Planos"],
    ...rows.map((row) => [
      formatDate(row.date),
      row.userName,
      row.userEmail,
      row.kind,
      formatCurrency(row.amountCents),
      row.status,
      row.provider,
      row.providerRef,
      row.listings,
      row.plans
    ])
  ]);

  return new Response(`\ufeff${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCell).join(";")).join("\r\n");
}

function escapeCell(value: string) {
  const safe = value ?? "";
  return `"${safe.replace(/"/g, '""')}"`;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
