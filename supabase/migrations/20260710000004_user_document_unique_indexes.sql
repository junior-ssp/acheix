-- Impede reutilizacao de CPF/CNPJ por contas diferentes.
-- Indices parciais preservam usuarios sem documento preenchido.

DROP INDEX IF EXISTS public.user_cpf_unique_not_null_idx;

CREATE UNIQUE INDEX IF NOT EXISTS user_cpf_unique_not_null_idx
  ON public."User" (cpf)
  WHERE cpf IS NOT NULL
    AND cpf <> ''
    AND lower(email) NOT IN ('junior.representacoes.br@gmail.com', 'douglas.chagas.sp@gmail.com');

CREATE UNIQUE INDEX IF NOT EXISTS user_cnpj_unique_not_null_idx
  ON public."User" (cnpj)
  WHERE cnpj IS NOT NULL AND cnpj <> '';
