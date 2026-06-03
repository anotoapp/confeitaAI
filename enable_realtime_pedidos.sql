-- enable_realtime_pedidos.sql
-- Cole e execute no SQL Editor do Supabase do ConfeitaAI
-- para ativar notificações em tempo real na tabela de pedidos!
--
-- ========================================================
-- COMO FUNCIONA:
-- Este script adiciona a tabela 'pedidos' na publicação de replicação do Supabase.
-- Com isso, sempre que um novo pedido for inserido, o Supabase transmitirá
-- o evento em tempo real para o painel administrativo da confeiteira!
-- ========================================================

-- Habilita o canal Supabase Realtime para a tabela de pedidos
alter publication supabase_realtime add table pedidos;
