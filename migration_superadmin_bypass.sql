-- migration_superadmin_bypass.sql
-- Cole e execute todo este código no SQL Editor do seu Supabase.
-- Isso concederá acesso total ao Super Admin (naturamixrepresentacoes@gmail.com) 
-- a todas as tabelas para permitir a impersonação e suporte aos clientes.

CREATE POLICY "Super Admin acesso total clientes" ON clientes 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com') 
WITH CHECK (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com');

CREATE POLICY "Super Admin acesso total configuracoes" ON configuracoes 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com') 
WITH CHECK (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com');

CREATE POLICY "Super Admin acesso total pedidos" ON pedidos 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com') 
WITH CHECK (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com');

CREATE POLICY "Super Admin acesso total produtos" ON produtos 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com') 
WITH CHECK (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com');

CREATE POLICY "Super Admin acesso total estoque" ON estoque 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com') 
WITH CHECK (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com');

CREATE POLICY "Super Admin acesso total transacoes" ON transacoes 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com') 
WITH CHECK (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com');

CREATE POLICY "Super Admin acesso total receitas" ON receitas 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com') 
WITH CHECK (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com');

CREATE POLICY "Super Admin acesso total mensagens" ON mensagens_cacau 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com') 
WITH CHECK (auth.jwt() ->> 'email' = 'naturamixrepresentacoes@gmail.com');
