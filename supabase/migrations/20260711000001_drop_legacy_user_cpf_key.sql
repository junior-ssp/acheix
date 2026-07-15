-- Remove a trava antiga de CPF que impedia a excecao controlada
-- para junior.representacoes.br@gmail.com e douglas.chagas.sp@gmail.com.
-- A unicidade geral continua protegida por user_cpf_unique_not_null_idx.

ALTER TABLE public."User" DROP CONSTRAINT IF EXISTS "User_cpf_key";
DROP INDEX IF EXISTS public."User_cpf_key";
