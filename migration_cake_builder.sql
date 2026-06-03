-- migration_cake_builder.sql
-- Cole e execute todo este código no SQL Editor do Supabase do ConfeitaAI

ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS cake_builder JSONB DEFAULT NULL;
COMMENT ON COLUMN configuracoes.cake_builder IS 'Configurações personalizadas do Monte seu Bolo de Festa (habilitado, tamanhos, preços, recheios, etc.)';
