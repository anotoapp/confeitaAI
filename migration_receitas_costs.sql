-- migration_receitas_costs.sql
-- Cole todo este código e execute no SQL Editor do Supabase do ConfeitaAI
-- para permitir o armazenamento dos custos operacionais detalhados das receitas.

ALTER TABLE receitas 
ADD COLUMN IF NOT EXISTS prep_time NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS labor_rate NUMERIC DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS gas_cost NUMERIC DEFAULT 2.00,
ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS fixed_overhead NUMERIC DEFAULT 1.00;

COMMENT ON COLUMN receitas.prep_time IS 'Tempo de preparo estimado em horas';
COMMENT ON COLUMN receitas.labor_rate IS 'Valor cobrado por hora de trabalho na receita';
COMMENT ON COLUMN receitas.gas_cost IS 'Custo estimado de gás e energia consumidos';
COMMENT ON COLUMN receitas.packaging_cost IS 'Custo da embalagem utilizada';
COMMENT ON COLUMN receitas.fixed_overhead IS 'Outros custos fixos e taxas adicionais';
