-- =================================================================================
-- SCRIPT DE ATIVAÇÃO DE RLS (ROW LEVEL SECURITY) - CONFEITAAI
-- =================================================================================
-- Este script irá:
-- 1. Ativar o RLS em todas as tabelas.
-- 2. Garantir acesso TOTAL para o dono da loja autenticado (nos próprios dados).
-- 3. Garantir acesso PARCIAL para visitantes anônimos da loja pública,
--    permitindo ler o cardápio e inserir pedidos/clientes, além de baixar estoque.
-- =================================================================================

-- 1. ATIVAÇÃO DO RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_cacau ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA USUÁRIO AUTENTICADO (DONO DA LOJA)
-- Garante que o dono logado possa fazer tudo (CRUD) apenas onde usuario_id = seu id.

CREATE POLICY "Dono tem acesso total clientes" ON clientes FOR ALL TO authenticated USING (usuario_id = auth.uid()::text) WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "Dono tem acesso total configuracoes" ON configuracoes FOR ALL TO authenticated USING (usuario_id = auth.uid()::text) WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "Dono tem acesso total pedidos" ON pedidos FOR ALL TO authenticated USING (usuario_id = auth.uid()::text) WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "Dono tem acesso total produtos" ON produtos FOR ALL TO authenticated USING (usuario_id = auth.uid()::text) WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "Dono tem acesso total usuarios" ON usuarios FOR ALL TO authenticated USING (id = auth.uid()::text) WITH CHECK (id = auth.uid()::text);
CREATE POLICY "Super Admin acesso total usuarios" ON usuarios FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com');
CREATE POLICY "Dono tem acesso total estoque" ON estoque FOR ALL TO authenticated USING (usuario_id = auth.uid()::text) WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "Dono tem acesso total transacoes" ON transacoes FOR ALL TO authenticated USING (usuario_id = auth.uid()::text) WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "Dono tem acesso total receitas" ON receitas FOR ALL TO authenticated USING (usuario_id = auth.uid()::text) WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "Dono tem acesso total mensagens" ON mensagens_cacau FOR ALL TO authenticated USING (usuario_id = auth.uid()::text) WITH CHECK (usuario_id = auth.uid()::text);

-- 3. POLÍTICAS PARA VISITANTES DA LOJA ONLINE (ANÔNIMOS)
-- Para o cardápio digital funcionar sem o cliente estar logado.

-- LEITURA PÚBLICA (Vitrine do Cardápio)
CREATE POLICY "Leitura anonima configuracoes" ON configuracoes FOR SELECT TO anon USING (true);
CREATE POLICY "Leitura anonima produtos" ON produtos FOR SELECT TO anon USING (true);
CREATE POLICY "Leitura anonima receitas" ON receitas FOR SELECT TO anon USING (true);
CREATE POLICY "Leitura anonima clientes" ON clientes FOR SELECT TO anon USING (true);
CREATE POLICY "Leitura anonima pedidos" ON pedidos FOR SELECT TO anon USING (true);
CREATE POLICY "Leitura anonima estoque" ON estoque FOR SELECT TO anon USING (true);

-- ESCRITA PÚBLICA (Checkout de Pedidos)
-- Permite que o visitante insira um novo pedido no Kanban.
CREATE POLICY "Inserir pedidos anonimo" ON pedidos FOR INSERT TO anon WITH CHECK (true);
-- Permite que o visitante insira seu cadastro na hora da compra.
CREATE POLICY "Inserir clientes anonimo" ON clientes FOR INSERT TO anon WITH CHECK (true);
-- O sistema atualiza o estoque e contagem do cliente ao fechar o pedido
CREATE POLICY "Atualizar clientes anonimo" ON clientes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Atualizar estoque anonimo" ON estoque FOR UPDATE TO anon USING (true) WITH CHECK (true);
