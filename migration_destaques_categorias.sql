-- migration_destaques_categorias.sql
-- Cole todo este código e execute no SQL Editor do Supabase do ConfeitaAI
-- para dar suporte a categorias customizadas (playlists) e produtos destacados.

-- 1. Adicionar colunas na tabela de produtos
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS destacado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS badge_destaque TEXT DEFAULT '';

-- 2. Adicionar coluna na tabela de configurações da loja
ALTER TABLE configuracoes 
ADD COLUMN IF NOT EXISTS categorias TEXT;

-- 3. Mensagem informativa
COMMENT ON COLUMN produtos.destacado IS 'Define se o produto aparece no carrossel de destaques no topo do cardápio';
COMMENT ON COLUMN produtos.badge_destaque IS 'Texto do selo personalizado do destaque, ex: EDIÇÃO LIMITADA';
COMMENT ON COLUMN configuracoes.categorias IS 'Lista de categorias em formato JSON ordenadas pela confeiteira';
