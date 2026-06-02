-- migration_aniversario_clientes.sql
-- Cole todo este código e execute no SQL Editor do Supabase do ConfeitaAI
-- para permitir o armazenamento da data de aniversário e observações adicionais dos clientes.

ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS birthday DATE;

ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN clientes.birthday IS 'Data de aniversário do cliente para campanhas e fidelidade';
COMMENT ON COLUMN clientes.notes IS 'Observações de comportamento, restrições alimentares ou preferências do cliente';
