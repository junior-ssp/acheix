const cpfSharingEmails = new Set([
  "junior.representacoes.br@gmail.com",
  "douglas.chagas.sp@gmail.com"
]);

export function canUseSharedCpf(email: string | null | undefined) {
  return cpfSharingEmails.has(String(email ?? "").trim().toLowerCase());
}

export function canShareCpfBetween(leftEmail: string | null | undefined, rightEmail: string | null | undefined) {
  return canUseSharedCpf(leftEmail) && canUseSharedCpf(rightEmail);
}

export function cpfSharingExceptionEmails() {
  return [...cpfSharingEmails];
}
