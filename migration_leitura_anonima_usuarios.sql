-- migration_leitura_anonima_usuarios.sql
-- Cole todo este código e execute no SQL Editor do Supabase do ConfeitaAI
-- para permitir que os clientes visitantes do cardápio digital verifiquem se a loja está ativa ou expirada.

-- Criar a política de leitura anônima para a tabela de usuários
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'usuarios' AND policyname = 'Leitura anonima usuarios'
    ) THEN
        CREATE POLICY "Leitura anonima usuarios" 
        ON public.usuarios 
        FOR SELECT 
        TO anon 
        USING (true);
    END IF;
END
$$;
