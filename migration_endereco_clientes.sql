-- migration_endereco_clientes.sql
-- Cole todo este código e execute no SQL Editor do Supabase do ConfeitaAI
-- para permitir o armazenamento do endereço e complemento dos clientes.

ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS complement TEXT;

COMMENT ON COLUMN clientes.address IS 'Endereço residencial do cliente (Rua, Número, Bairro, Cidade)';
COMMENT ON COLUMN clientes.complement IS 'Complemento ou ponto de referência do endereço do cliente';
