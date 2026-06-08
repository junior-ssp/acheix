# Verificação de identidade - pendências antes da inauguração

O que já está gratuito e ativo:

- Cadastro exige nome, CPF, data de nascimento, e-mail, telefone e WhatsApp.
- CPF passa pela validação matemática dos dígitos.
- O banco já possui campos para controle de verificação:
  - `cpfVerifiedAt`
  - `phoneVerifiedAt`
  - `whatsappVerifiedAt`
  - `identityVerifiedAt`
  - `verificationProvider`
- O selo `Conta verificada` só aparece quando `identityVerifiedAt` estiver preenchido.

O que depende de serviço pago ou contrato:

- Validar CPF, nome e data de nascimento na Receita Federal/SERPRO.
- Validar posse do WhatsApp por OTP/mensagem.
- Opcionalmente validar documento/selfie via Datavalid.

Sugestão para produção:

1. Contratar SERPRO Consulta CPF ou Datavalid, ou provedor que comprove uso de base oficial.
2. Configurar no `.env`:
   - `CPF_VERIFICATION_PROVIDER`
   - `CPF_VERIFICATION_TOKEN`
3. Contratar provedor de WhatsApp com webhook.
4. Configurar no `.env`:
   - `WHATSAPP_PROVIDER_URL`
   - `WHATSAPP_PROVIDER_TOKEN`
5. Só marcar `identityVerifiedAt` quando CPF + nome + nascimento + WhatsApp forem confirmados.

Lembrete: antes de inaugurar, revisar LGPD, Termos de Uso e Política de Privacidade para explicar a finalidade da coleta e validação desses dados.
