-- ================================================
-- MIGRAÇÃO: Sistema de Planos SaaS - ConfeitaAI
-- Execute este SQL no Editor SQL do Supabase
-- ================================================

-- 1. Adicionar coluna de plano (Trial ou PRO)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Trial';

-- 2. Adicionar data de expiração do plano
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');

-- 3. Adicionar data do último login
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT NULL;

-- 4. (Opcional) Marcar usuário Vitor ADM como PRO sem expiração
UPDATE usuarios 
SET plan = 'PRO', plan_expires_at = NULL 
WHERE role = 'Super Admin';

-- ================================================
-- VERIFICAÇÃO: Checar se as colunas foram criadas
-- ================================================
SELECT id, name, email, role, plan, plan_expires_at, last_login 
FROM usuarios 
ORDER BY created_at DESC;
