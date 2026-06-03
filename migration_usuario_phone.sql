-- migration_usuario_phone.sql
-- Cole todo este código e execute no SQL Editor do Supabase do ConfeitaAI
-- para permitir o armazenamento do número de WhatsApp das confeiteiras no cadastro.

ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

COMMENT ON COLUMN usuarios.phone IS 'Número de WhatsApp da confeiteira cadastrado no sistema ConfeitaAI';
