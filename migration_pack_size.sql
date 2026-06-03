-- Adiciona a coluna pack_size na tabela estoque se ela não existir
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS pack_size NUMERIC;

-- Comentário explicativo sobre a coluna
COMMENT ON COLUMN estoque.pack_size IS 'Tamanho ou peso da embalagem de compra do ingrediente (ex: 395 para lata de leite condensado de 395g)';
