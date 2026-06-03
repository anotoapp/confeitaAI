-- migration_cardapios_simulados.sql
-- Cole e execute no SQL Editor do Supabase do ConfeitaAI
-- para criar 3 lojas simuladas (com produtos e fotos cadastradas)
-- para você usar como portfólio no Instagram!
--
-- URLs criadas:
-- 1. https://confeita-ai.vercel.app/atelie-de-bolos
-- 2. https://confeita-ai.vercel.app/cookies-da-ju
-- 3. https://confeita-ai.vercel.app/mari-brigadeiria
--
-- ========================================================
-- QUER REMOVER ESSAS LOJAS SIMULADAS DEPOIS?
-- Cole e rode o comando abaixo no SQL Editor do Supabase:
--
-- DELETE FROM produtos WHERE usuario_id IN ('atelie-de-bolos', 'cookies-da-ju', 'mari-brigadeiria');
-- DELETE FROM configuracoes WHERE usuario_id IN ('atelie-de-bolos', 'cookies-da-ju', 'mari-brigadeiria');
-- ========================================================

-- ========================================================
-- 1. LIMPAR DADOS ANTERIORES SE JÁ EXISTIREM
-- ========================================================
DELETE FROM produtos WHERE usuario_id IN ('atelie-de-bolos', 'cookies-da-ju', 'mari-brigadeiria');
DELETE FROM configuracoes WHERE usuario_id IN ('atelie-de-bolos', 'cookies-da-ju', 'mari-brigadeiria');

-- ========================================================
-- 2. CONFIGURAR LOJAS (Banners, Logos, Slugs, Cores)
-- ========================================================
INSERT INTO configuracoes (id, usuario_id, name, slug, phone, hours, logo, banner, "desc", cor_tema, loja_aberta) VALUES
(
    'atelie-de-bolos', 'atelie-de-bolos', 
    'Ateliê de Bolos da Ju', 'atelie-de-bolos', 
    '5511999998888', 'Seg a Sáb, 10h às 19h',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?w=1000&h=500&fit=crop', -- Cozy bakery shelves banner (Status 200)
    'Bolos festivos e caseiros decorados com amor. Transformamos seus momentos especiais em fatias deliciosas! 🎂✨',
    '#db8b9a', true
),
(
    'cookies-da-ju', 'cookies-da-ju', 
    'Ju Cookies & Co.', 'cookies-da-ju', 
    '5511988887777', 'Ter a Dom, 13h às 21h',
    'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&h=300&fit=crop', -- Cookie stack logo (Status 200)
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1000&h=500&fit=crop', -- Cooking/flour banner (Status 200)
    'Cookies americanos legítimos, crocantes por fora e super recheados por dentro. Servidos sempre quentinhos! 🍪🔥',
    '#af8a5b', true
),
(
    'mari-brigadeiria', 'mari-brigadeiria', 
    'Mari Brigadeiria Gourmet', 'mari-brigadeiria', 
    '5511977776666', 'Seg a Sex, 09h às 18h',
    'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=300&h=300&fit=crop', -- Premium chocolate truffles logo (Status 200 - replaces tangerines)
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1000&h=500&fit=crop', -- Bakery display sweets banner (Status 200)
    'Doces finos e brigadeiros gourmet elaborados com o melhor chocolate belga. Adoce sua comemoração com elegância! 🍫🧁',
    '#845ec2', true
);

-- ========================================================
-- 3. CADASTRAR PRODUTOS DOS CARDÁPIOS SIMULADOS
-- ========================================================
INSERT INTO produtos (id, usuario_id, name, price, category, description, emoji, destacado, badge_destaque, photo) VALUES
-- Loja 1: Ateliê de Bolos
('p_bolo_1', 'atelie-de-bolos', 'Bolo Red Velvet Supreme', 120.00, 'Bolos Festivos', 'Massa aveludada com recheio cremoso à base de cream cheese e geleia de frutas vermelhas artesanal.', '🍰', true, 'Queridinho 🏆', 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=400&h=400&fit=crop'),
('p_bolo_2', 'atelie-de-bolos', 'Caseirinho de Cenoura com Chocolate', 35.00, 'Bolos Caseiros', 'Tradicional bolo de cenoura super fofinho com uma cobertura generosa de brigadeiro gourmet.', '🥕', false, '', 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=400&h=400&fit=crop'),
('p_bolo_3', 'atelie-de-bolos', 'Bolo Vulcão de Dois Amores', 48.00, 'Bolos Caseiros', 'Bolo de chocolate com recheio cremoso de brigadeiro preto e brigadeiro branco que escorre ao cortar.', '🌋', true, 'Vulcão 🌋', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=400&fit=crop'),
('p_bolo_4', 'atelie-de-bolos', 'Slice Cake Ninho com Nutella', 18.00, 'Fatias', 'Fatia generosa de bolo de chocolate com recheio duplo de brigadeiro de leite Ninho e Nutella pura.', '🍫', false, '', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop'),
('p_bolo_5', 'atelie-de-bolos', 'Mini Naked Cake de Casamento', 180.00, 'Bolos Festivos', 'Bolo de massa branca com recheio de doce de leite artesanal e nozes, decorado com flores físicas.', '🌸', false, '', 'https://images.unsplash.com/photo-1519340333755-56e9c1d04579?w=400&h=400&fit=crop'), -- Wedding/Naked Cake (Status 200)

-- Loja 2: Ju Cookies
('p_cookie_1', 'cookies-da-ju', 'Cookie Classic Chocochip', 12.00, 'Cookies Tradicionais', 'Massa amanteigada clássica de baunilha com gotas abundantes de chocolate meio amargo.', '🍪', true, 'Mais Vendido ⭐', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop'),
('p_cookie_2', 'cookies-da-ju', 'Cookie Triplo Chocolate', 14.00, 'Cookies Especiais', 'Massa de cacau black com gotas de chocolate branco, ao leite e meio amargo.', '🍫', false, '', 'https://images.unsplash.com/photo-1600431521340-491eca880813?w=400&h=400&fit=crop'), -- Triple Chocolate Cookie (Status 200)
('p_cookie_3', 'cookies-da-ju', 'Cookie Red Velvet com Cream Cheese', 15.00, 'Cookies Especiais', 'Bolo-cookie Red Velvet recheado com uma deliciosa trufa de cream cheese doce.', '❤️', true, 'Premium 👑', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=400&fit=crop'), -- Premium Brownie-cookie (Status 200)
('p_cookie_4', 'cookies-da-ju', 'Brownie Supremo de Doce de Leite', 10.50, 'Brownies', 'Brownie super fudgy de chocolate meio amargo com cobertura de doce de leite e flor de sal.', '🍮', false, '', 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&h=400&fit=crop'),
('p_cookie_5', 'cookies-da-ju', 'Copo Cookie de Nutella e Sorvete', 22.00, 'Sobremesas', 'Copo feito de massa de cookie, pintado com chocolate belga por dentro, recheado de Nutella.', '🍨', false, '', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop'),

-- Loja 3: Mari Brigadeiria
('p_brig_1', 'mari-brigadeiria', 'Brigadeiro Belga Tradicional', 4.50, 'Gourmet', 'Brigadeiro clássico cremoso feito com chocolate belga Callebaut 54% cacau e granulado split.', '🍫', true, 'Tradicional 🇧🇪', 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&h=400&fit=crop'), -- Premium truffles (Status 200 - replaces tangerines)
('p_brig_2', 'mari-brigadeiria', 'Brigadeiro de Pistache Nobre', 5.50, 'Especiais', 'Brigadeiro feito com pasta italiana de pistache puro, envolto em pistache triturado.', '💚', true, 'Sofisticado ✨', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&h=400&fit=crop'), -- Pistachio (Status 200)
('p_brig_3', 'mari-brigadeiria', 'Brigadeiro de Crème Brûlée', 5.00, 'Especiais', 'Brigadeiro de baunilha de Madagascar recheado com doce de leite e casquinha caramelizada no maçarico.', '🔥', false, '', 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=400&h=400&fit=crop'), -- Crème Brûlée truffle (Status 200 - replaces raw flour)
('p_brig_4', 'mari-brigadeiria', 'Caixa Presente com 12 Doces', 55.00, 'Presentes', 'Linda caixa cartonada para presente contendo 12 doces gourmet sortidos da sua escolha.', '🎁', false, '', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=400&fit=crop'),
('p_brig_5', 'mari-brigadeiria', 'Coxinha de Morango com Brigadeiro', 12.50, 'Especiais', 'Morango fresco gigante envolvido em brigadeiro belga cremoso e granulado belga.', '🍓', false, '', 'https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=400&h=400&fit=crop');
