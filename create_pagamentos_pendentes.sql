-- Tabela para armazenar e-mails de clientes que pagaram na Kiwify ANTES de criar a conta no ConfeitaAI
CREATE TABLE IF NOT EXISTS public.pagamentos_pendentes (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar segurança em nível de linha (RLS) - opcional, mas boa prática
ALTER TABLE public.pagamentos_pendentes ENABLE ROW LEVEL SECURITY;

-- Como essa tabela será lida pelo frontend durante o cadastro (via api/db.js), 
-- e a API utiliza a Service Role (SUPABASE_KEY), a RLS não bloqueará o backend.
-- Garantimos acesso público se necessário no futuro para leitura simples
CREATE POLICY "Permitir leitura anon" ON public.pagamentos_pendentes FOR SELECT USING (true);
CREATE POLICY "Permitir delete anon" ON public.pagamentos_pendentes FOR DELETE USING (true);
