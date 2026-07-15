const productAutoApprovalEmails = new Set([
  "junior.representacoes.br@gmail.com",
  "douglas.chagas.sp@gmail.com"
]);

export function canAutoApproveProductListing(user: { email?: string | null } | null | undefined) {
  return productAutoApprovalEmails.has(String(user?.email ?? "").trim().toLowerCase());
}
