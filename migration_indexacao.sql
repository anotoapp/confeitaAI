-- migration_indexacao.sql
-- Cole todo este código e execute no SQL Editor do Supabase do ConfeitaAI
-- para acelerar as consultas e indexar as tabelas pelo usuario_id (tenant).

-- 1. Indexar clientes
CREATE INDEX IF NOT EXISTS idx_clientes_usuario ON clientes(usuario_id);

-- 2. Indexar pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);

-- 3. Indexar produtos
CREATE INDEX IF NOT EXISTS idx_produtos_usuario ON produtos(usuario_id);

-- 4. Indexar estoque
CREATE INDEX IF NOT EXISTS idx_estoque_usuario ON estoque(usuario_id);

-- 5. Indexar transações/fluxo de caixa
CREATE INDEX IF NOT EXISTS idx_transacoes_usuario ON transacoes(usuario_id);

-- 6. Indexar receitas
CREATE INDEX IF NOT EXISTS idx_receitas_usuario ON receitas(usuario_id);

-- 7. Indexar mensagens de chat da Cacau
CREATE INDEX IF NOT EXISTS idx_mensagens_usuario ON mensagens_cacau(usuario_id);

-- 8. Indexar fiados e consignações
CREATE INDEX IF NOT EXISTS idx_fiados_usuario ON fiados(usuario_id);

COMMENT ON INDEX idx_clientes_usuario IS 'Acelera a listagem de clientes do inquilino';
COMMENT ON INDEX idx_pedidos_usuario IS 'Acelera a busca e listagem de encomendas no Kanban';
COMMENT ON INDEX idx_produtos_usuario IS 'Acelera a busca de produtos do cardápio e do painel';
COMMENT ON INDEX idx_estoque_usuario IS 'Acelera a listagem de matérias-primas';
COMMENT ON INDEX idx_transacoes_usuario IS 'Acelera a consolidação de gráficos e fluxo financeiro';
COMMENT ON INDEX idx_receitas_usuario IS 'Acelera as fichas técnicas e precificações';
COMMENT ON INDEX idx_mensagens_usuario IS 'Acelera o histórico de mensagens com a Cacau';
COMMENT ON INDEX idx_fiados_usuario IS 'Acelera a listagem da aba de fiados';
