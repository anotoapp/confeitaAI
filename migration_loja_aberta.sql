-- migration_loja_aberta.sql
-- Cole todo este código e execute no SQL Editor do Supabase do ConfeitaAI
-- para permitir o salvamento do status de funcionamento da loja (aberta/fechada).

ALTER TABLE configuracoes 
ADD COLUMN IF NOT EXISTS loja_aberta BOOLEAN DEFAULT true;

COMMENT ON COLUMN configuracoes.loja_aberta IS 'Indica se a confeitaria está aberta e aceitando novos pedidos no cardápio digital';
