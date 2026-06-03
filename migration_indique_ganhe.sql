-- ==========================================
-- SCRIPT: PROGRAMA INDIQUE E GANHE
-- ==========================================

-- 1. Adiciona a coluna referred_by para rastrear quem fez a indicação
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- 2. Adiciona a coluna comissao_recebida para rastrear o quanto o afiliado já sacou
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS comissao_recebida numeric DEFAULT 0;
