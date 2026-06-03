-- migration_fiados.sql
-- Cole todo este código e execute no SQL Editor do Supabase do ConfeitaAI
-- para criar a tabela de controle de fiados e consignações.

CREATE TABLE IF NOT EXISTS fiados (
    id VARCHAR(50) PRIMARY KEY,
    usuario_id VARCHAR(50),
    client_name VARCHAR(255) NOT NULL,
    client_id VARCHAR(50) REFERENCES clientes(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    due_date DATE,
    description TEXT,
    total_val NUMERIC DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pendente',
    type VARCHAR(50) DEFAULT 'Fiado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security)
ALTER TABLE fiados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono tem acesso total fiados" ON fiados
    FOR ALL TO authenticated
    USING (usuario_id = auth.uid()::text)
    WITH CHECK (usuario_id = auth.uid()::text);

CREATE POLICY "Leitura anonima fiados" ON fiados
    FOR SELECT TO anon
    USING (true);

COMMENT ON TABLE fiados IS 'Tabela para controle de fiados e consignações de mercadorias em estabelecimentos';
