-- Permite que apenas as duas contas administrativas informadas compartilhem CPF.
-- O backend continua bloqueando qualquer outra duplicidade.

DROP INDEX IF EXISTS public.user_cpf_unique_not_null_idx;

CREATE UNIQUE INDEX IF NOT EXISTS user_cpf_unique_not_null_idx
  ON public."User" (cpf)
  WHERE cpf IS NOT NULL
    AND cpf <> ''
    AND lower(email) NOT IN ('junior.representacoes.br@gmail.com', 'douglas.chagas.sp@gmail.com');
