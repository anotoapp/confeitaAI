-- ================================================
-- ATUALIZAÇÃO: Adicionar suporte a fotos nos produtos
-- Copie todo este código e cole no SQL Editor do Supabase
-- ================================================

ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS photo TEXT;

-- ================================================
-- Fim da execução
-- ================================================
