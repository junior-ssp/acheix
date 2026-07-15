Validação de recuperação de senha (ambiente sem SMTP)

Contexto:
- Em dev, `sendEmail` registra entradas em `AuditLog` quando `SMTP_HOST` não está configurado.
- O campo `metadata.resetUrl` do `AuditLog` contém o link de redefinição temporário.

Passos para reproduzir/validar:
1) No app, solicite recuperação de senha para o e-mail do usuário (ou use o endpoint POST `/api/auth/password-reset/request`).
2) No Supabase Dashboard → SQL Editor, execute:

SELECT (metadata->>'resetUrl') AS resetUrl, metadata, "createdAt"
FROM "AuditLog"
WHERE action = 'auth.password_reset.requested'
  AND (metadata->>'email') = '<user@example.com>'
ORDER BY "createdAt" DESC
LIMIT 5;

3) Copie o `resetUrl` retornado e cole em uma janela anônima do navegador. O link expira em 30 minutos por padrão.
4) Abra o link, defina a nova senha e faça login para confirmar que a alteração funcionou.

Dicas:
- Se não houver registros em `AuditLog`, verifique se a API `/api/auth/password-reset/request` retornou `ok: true`.
- Em produção, configure as variáveis SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`) e faça um teste de envio.
