-- migration_cor_tema.sql
-- Execute este comando no SQL Editor do Supabase para dar suporte
-- ao salvamento de cor customizada do cardápio digital do cliente.

ALTER TABLE configuracoes 
ADD COLUMN IF NOT EXISTS cor_tema VARCHAR(50) DEFAULT '#ff7eb9';

COMMENT ON COLUMN configuracoes.cor_tema IS 'Cor hexadecimal do tema customizado escolhido pela confeiteira para o cardápio digital';
