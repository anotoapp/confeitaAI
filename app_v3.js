/* ==========================================================================
   ConfeitaAI - Hybrid Database Engine (Supabase + LocalStorage Fallback)
   ========================================================================== */

// 1. Connection Configurations & Feature Flags
let SUPABASE_URL = localStorage.getItem("confeitaai_supabase_url");
let SUPABASE_KEY = localStorage.getItem("confeitaai_supabase_key");

let supabaseClient = null;
let isSupabaseActive = false;
let forcedOffline = localStorage.getItem("confeitaai_forced_offline") === "true";

// Global Dashboard Month Navigator State
let dashSelectedMonth = new Date().getMonth();
let dashSelectedYear = new Date().getFullYear();
let dashPeriodType = 'month'; // 'month', 'day', '7days', '15days', '30days'
let dashSelectedDate = new Date(); // for specific day view
let currentView = 'mes';

// Global Pricing Parameters
let DEFAULT_MARKUP = parseFloat(localStorage.getItem("confeitaai_default_markup")) || 200;
let DEFAULT_PACKAGING = parseFloat(localStorage.getItem("confeitaai_default_packaging")) || 5.00;
function getLocalDateStr(dateObj = new Date()) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

async function initSupabaseClient() {
    try {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            try {
                const res = await fetch('/api/config');
                const config = await res.json();
                SUPABASE_URL = SUPABASE_URL || config.SUPABASE_URL;
                SUPABASE_KEY = SUPABASE_KEY || config.SUPABASE_KEY;
            } catch(e) {
                console.warn('Could not fetch config API, using local storage values only.');
            }
        }

        if (window.supabase && !forcedOffline && SUPABASE_URL && SUPABASE_KEY) {
            const isStorefront = document.body.classList.contains("standalone-storefront-mode");
            if (isStorefront) {
                // Se for a vitrine pública, inicializa um cliente 100% anônimo sem ler ou persistir a sessão do painel adm
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                });
                console.log("Supabase inicializado para MODO VITRINE (Anônimo e Seguro)! 🌐");
            } else {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                console.log("Supabase inicializado com sucesso! 🌐");
            }
            isSupabaseActive = true;
        } else {
            supabaseClient = null;
            isSupabaseActive = false;
            console.warn("Forçado Offline ou SDK do Supabase não encontrado. Usando modo local (LocalStorage) 💾");
        }
    } catch (err) {
        console.error("Falha ao configurar Supabase client, usando modo local:", err);
        supabaseClient = null;
        isSupabaseActive = false;
    }
}

// Memory Cache State
let state = {
    users: [],
    products: [],
    ingredients: [],
    clients: [],
    orders: [],
    transactions: [],
    recipes: [],
    cacauMessages: [],
    fiados: [],
    storeConfig: {
        name: "Doces da Ju",
        slug: "docesdaju",
        hours: "Seg a Sex, 09h às 18h",
        logo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop",
        desc: "Nossos doces e bolos gourmet são produzidos com ingredientes nobres e muito amor para adoçar os seus momentos mais especiais.",
        cor_tema: "#ff7eb9",
        loja_aberta: true
    }
};

let customerCart = [];

// Seed Data definition for Local fallback or fresh loads
const seedData = {
    products: [
        { id: "p1", name: "Bolo Red Velvet", price: 150.00, category: "Bolos", desc: "Massa leve de cacau vermelho, recheio cremoso de cream cheese e geleia artesanal de morango.", emoji: "🎂", recipeId: "r1" },
        { id: "p2", name: "Cento de Brigadeiros Gourmet", price: 120.00, category: "Docinhos", desc: "Brigadeiros enrolados na hora com chocolate belga e confeitos nobres.", emoji: "🍫", recipeId: "r2" },
        { id: "p3", name: "Torta de Limão Merengada", price: 85.00, category: "Tortas", desc: "Base de biscoito amanteigado, creme de limão siciliano aveludado e merengue suíço maçaricado.", emoji: "🍓", recipeId: "r3" },
        { id: "p4", name: "Cupcake de Baunilha Frutas Vermelhas", price: 12.00, category: "Cupcakes", desc: "Cupcake macio de baunilha recheado com compota de frutas vermelhas e cobertura de buttercream.", emoji: "🧁", recipeId: "r4" }
    ],
    ingredients: [
        { id: "i1", name: "Farinha de Trigo", qty: 3000, unit: "g", min: 1000, price: 6.50 },
        { id: "i2", name: "Açúcar Refinado", qty: 800, unit: "g", min: 1000, price: 4.80 },
        { id: "i3", name: "Manteiga sem Sal", qty: 1500, unit: "g", min: 500, price: 32.00 },
        { id: "i4", name: "Chocolate em Pó 50%", qty: 150, unit: "g", min: 400, price: 28.00 },
        { id: "i5", name: "Ovos Brancos Médios", qty: 36, unit: "un", min: 12, price: 18.00 }
    ],
    clients: [
        { id: "c1", name: "Amanda Lima", phone: "11988887777", orderCount: 2, totalSpent: 270.00 },
        { id: "c2", name: "João Silva", phone: "11977776666", orderCount: 1, totalSpent: 120.00 },
        { id: "c3", name: "Maria Costa", phone: "11966665555", orderCount: 0, totalSpent: 0.00 }
    ],
    orders: [
        { id: "o1", clientId: "c1", productId: "p1", qty: 1, val: 150.00, date: "2026-05-20", time: "15:00", status: "Em Produção", notes: "Escrever 'Parabéns, Letícia' em chocolate branco na borda." },
        { id: "o2", clientId: "c2", productId: "p2", qty: 1, val: 120.00, date: "2026-05-23", time: "10:30", status: "Recebido", notes: "Forminhas na cor rosa claro e dourado." }
    ],
    transactions: [
        { id: "t1", date: "2026-05-10", desc: "Venda de Bolo Red Velvet - Amanda Lima", type: "Entrada", category: "Vendas", val: 150.00 },
        { id: "t2", date: "2026-05-12", desc: "Compra de Embalagens e Formas", type: "Saída", category: "Utensílios", val: 45.00 },
        { id: "t3", date: "2026-05-14", desc: "Compra de Ingredientes Semanal", type: "Saída", category: "Ingredientes", val: 120.00 },
        { id: "t4", date: "2026-05-18", desc: "Festa Corporativa (Docinhos) - Amanda Lima", type: "Entrada", category: "Vendas", val: 120.00 }
    ],
    recipes: [
        {
            id: "r1",
            name: "Massa Base de Bolo Red Velvet",
            yield: 1,
            ingredients: [
                { ingId: "i1", amount: 350 },
                { ingId: "i2", amount: 300 },
                { ingId: "i3", amount: 150 },
                { ingId: "i4", amount: 30 },
                { ingId: "i5", amount: 4 }
            ],
            margin: 200
        },
        {
            id: "r2",
            name: "Massa de Brigadeiro Gourmet",
            yield: 1,
            ingredients: [],
            margin: 200
        },
        {
            id: "r3",
            name: "Torta de Limão Merengada",
            yield: 1,
            ingredients: [],
            margin: 200
        },
        {
            id: "r4",
            name: "Cupcake de Baunilha",
            yield: 1,
            ingredients: [],
            margin: 200
        }
    ],
    cacauMessages: [
        { sender: "cacau", text: "Olá! Seja muito bem-vinda ao **ConfeitaAI**! Eu sou a **Cacau**, sua assistente inteligente. 🍰", time: "18:50" },
        { sender: "cacau", text: "Estou conectada ao seu banco de dados na nuvem com o **Supabase**! Agora tudo o que você me pedir ficará salvo online de verdade. 🌐", time: "18:51" }
    ],
    users: [
        { id: "admin_local", name: "Super Admin", username: "admin", email: "naturamixrepresentacoes@gmail.com", password: "123", role: "Super Admin", status: "Ativo", plan: "PRO" }
    ],
    storeConfig: {
        name: "Minha Loja",
        slug: "",
        hours: "Seg a Sex, 09h às 18h",
        logo: "",
        desc: "",
        cor_tema: "#ff7eb9"
    }
};

const emptyState = {
    products: [],
    ingredients: [],
    clients: [],
    orders: [],
    transactions: [],
    recipes: [],
    cacauMessages: [],
    fiados: [],
    users: [],
    storeConfig: {
        name: "Minha Loja",
        slug: "",
        hours: "Seg a Sex, 09h às 18h",
        logo: "",
        desc: "",
        cor_tema: "#ff7eb9"
    }
};

function isImpersonating() {
    const session = localStorage.getItem("confeitaai_session");
    if (!session) return false;
    try {
        const sessionData = JSON.parse(session);
        return sessionData.role === "Super Admin" && !!localStorage.getItem("confeitaai_impersonated_user_id");
    } catch (e) {
        return false;
    }
}

window.startImpersonation = function(userId, userName) {
    localStorage.setItem("confeitaai_impersonated_user_id", userId);
    localStorage.setItem("confeitaai_impersonated_user_name", userName);
    // Clear target user's local state cache to force fetching clean data from Supabase
    localStorage.removeItem(`confeitaai_state_${userId}`);
    location.reload();
};

window.exitImpersonation = function() {
    localStorage.removeItem("confeitaai_impersonated_user_id");
    localStorage.removeItem("confeitaai_impersonated_user_name");
    location.reload();
};

function checkAndRenderImpersonationBanner() {
    if (isImpersonating()) {
        const targetName = localStorage.getItem("confeitaai_impersonated_user_name") || "Cliente";
        
        // Remove existing if any
        const existing = document.getElementById("impersonation-banner");
        if (existing) existing.remove();
        
        const banner = document.createElement("div");
        banner.id = "impersonation-banner";
        banner.style.cssText = "background: linear-gradient(90deg, #d97706, #ef4444); color: white; padding: 12px 24px; text-align: center; font-size: 14px; font-weight: 600; display: flex; justify-content: center; align-items: center; gap: 15px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); position: relative; z-index: 10000; width: 100%; box-sizing: border-box; flex-shrink: 0;";
        banner.innerHTML = `
            <span>🕵️ <strong>MODO SUPORTE:</strong> Você está visualizando e configurando o painel de <strong>${targetName}</strong>.</span>
            <button onclick="exitImpersonation()" style="background: white; color: #ef4444; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px; transition: all 0.2s ease;">
                Sair da Simulação
            </button>
        `;
        
        const workspace = document.querySelector(".main-workspace");
        if (workspace) {
            workspace.prepend(banner);
        } else {
            document.body.prepend(banner);
        }
    }
}

function getLoggedInUserId() {
    const session = localStorage.getItem("confeitaai_session");
    if (!session) return null;
    try {
        const sessionData = JSON.parse(session);
        if (sessionData.role === "Super Admin") {
            const impersonatedId = localStorage.getItem("confeitaai_impersonated_user_id");
            if (impersonatedId) {
                return impersonatedId;
            }
        }
        return sessionData.id || null;
    } catch (e) {
        return null;
    }
}

function getLoggedInUserEmail() {
    const session = localStorage.getItem("confeitaai_session");
    if (!session) return null;
    try {
        const sessionData = JSON.parse(session);
        return sessionData.email || null;
    } catch (e) {
        return null;
    }
}

function getLoggedInUserRole() {
    const session = localStorage.getItem("confeitaai_session");
    if (!session) return null;
    try {
        const sessionData = JSON.parse(session);
        if (sessionData.role === "Super Admin" && localStorage.getItem("confeitaai_impersonated_user_id")) {
            return "Confeiteira";
        }
        return sessionData.role || null;
    } catch (e) {
        return null;
    }
}

// Local storage backup utilities with safety checks
function saveToLocalStorage() {
    try {
        const userId = getLoggedInUserId() || "global";
        localStorage.setItem(`confeitaai_state_${userId}`, JSON.stringify(state));
    } catch (err) {
        console.error("Erro ao salvar no LocalStorage:", err);
    }
}

function getFromLocalStorage() {
    try {
        const userId = getLoggedInUserId() || "global";
        if (userId !== "global") {
            return localStorage.getItem(`confeitaai_state_${userId}`);
        }
        return localStorage.getItem("confeitaai_state");
    } catch (err) {
        console.error("Erro ao ler do LocalStorage:", err);
        return null;
    }
}

// Helper to sanitize and merge loaded state to prevent model corruption on version changes
function sanitizeAndMergeState(loadedState) {
    if (!loadedState || typeof loadedState !== 'object') {
        return JSON.parse(JSON.stringify(seedData));
    }
    return {
        products: (Array.isArray(loadedState.products) ? loadedState.products : []).map(p => ({
            id: p.id,
            name: p.name || "Sem nome",
            price: parseFloat(p.price) || 0,
            category: p.category || "Geral",
            desc: p.desc || p.description || "",
            emoji: p.emoji || "🧁",
            recipeId: p.recipeId || p.recipe_id || null
        })),
        ingredients: Array.isArray(loadedState.ingredients) ? loadedState.ingredients : [],
        clients: Array.isArray(loadedState.clients) ? loadedState.clients : [],
        orders: Array.isArray(loadedState.orders) ? loadedState.orders : [],
        transactions: Array.isArray(loadedState.transactions) ? loadedState.transactions : [],
        recipes: Array.isArray(loadedState.recipes) ? loadedState.recipes : [],
        cacauMessages: Array.isArray(loadedState.cacauMessages) ? loadedState.cacauMessages : [],
        fiados: Array.isArray(loadedState.fiados) ? loadedState.fiados : [],
        users: (Array.isArray(loadedState.users) && loadedState.users.length > 0) ? loadedState.users : JSON.parse(JSON.stringify(seedData.users)),
        storeConfig: loadedState.storeConfig || JSON.parse(JSON.stringify(seedData.storeConfig))
    };
}


// 2. Load & Sync State (Supabase OR LocalStorage Fallback)
async function loadState() {
    showLoadingIndicator();
    
    // OPTIMISTIC LOAD: Load local cache first so startup is instantaneous
    const saved = getFromLocalStorage();
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = sanitizeAndMergeState(parsed);
            console.log("Carga otimista carregada do LocalStorage! 🚀");
            checkSession();
            populateStoreForm();
        } catch (e) {
            console.error("Erro na carga otimista:", e);
        }
    } else {
        // Safe seeding on fresh startup if no cache exists
        // If we are logged in or Supabase is active, use empty template to prevent flashing seed data
        const initialTemplate = (isSupabaseActive || getLoggedInUserId()) ? emptyState : seedData;
        state = sanitizeAndMergeState(initialTemplate);
        checkSession();
        populateStoreForm();
    }

    // If Supabase is inactive, we are done
    if (!isSupabaseActive) {
        console.log("Modo offline/local ativado.");
        hideLoadingIndicator();
        populateStoreForm();
        checkSession();
        if (document.body.classList.contains("standalone-storefront-mode")) {
            openMenuPreview();
        }
        return;
    }

    // 1. MODO CARDÁPIO DIGITAL (Storefront): Carregamento isolado e ultrasseguro
    const urlParams = new URLSearchParams(window.location.search);
    let storefrontSlug = urlParams.get('loja');
    if (!storefrontSlug) {
        const path = window.location.pathname;
        if (path && path !== '/' && path !== '/app' && path !== '/index.html') {
            storefrontSlug = path.replace('/', '').replace('.html', '').trim();
        }
    }
    if (storefrontSlug) {
        storefrontSlug = decodeURIComponent(storefrontSlug).trim();
        try {
            console.log("Carregando cardápio digital isolado para a loja:", storefrontSlug);
            // Busca as configurações da loja associada a esse slug
            let { data: configData, error: configErr } = await supabaseClient
                .from('configuracoes')
                .select('*')
                .eq('slug', storefrontSlug)
                .limit(1)
                .maybeSingle();

            if (configErr) throw configErr;

            // Se não encontrar diretamente pelo slug, faz uma busca inteligente/aproximada (ex: removendo pontos/caracteres especiais)
            if (!configData) {
                const cleanSlug = storefrontSlug.replace(/[^a-z0-9]/g, "");
                console.log("Slug não encontrado diretamente. Tentando busca inteligente por slug limpo:", cleanSlug);
                
                const { data: allConfigs, error: allErr } = await supabaseClient
                    .from('configuracoes')
                    .select('*');
                    
                if (!allErr && allConfigs) {
                    configData = allConfigs.find(c => {
                        const dbClean = (c.slug || "").replace(/[^a-z0-9]/g, "");
                        return dbClean === cleanSlug;
                    }) || null;
                }
            }

            if (configData) {
                let cleanPhone = (configData.phone || "").replace(/\D/g, '');
                if (cleanPhone && cleanPhone.length <= 11) {
                    cleanPhone = "55" + cleanPhone;
                }
                state.storeConfig = {
                    usuario_id: configData.usuario_id,
                    name: configData.name || "Minha Confeitaria",
                    slug: configData.slug || storefrontSlug,
                    phone: cleanPhone,
                    hours: configData.hours || "Horário a combinar",
                    logo: configData.logo || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop",
                    banner: configData.banner || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=400&fit=crop",
                    desc: configData.desc || "",
                    cor_tema: configData.cor_tema || "#ff7eb9",
                    loja_aberta: configData.loja_aberta !== false,
                    cake_builder: configData.cake_builder || null
                };
                applyStorefrontThemeColor(state.storeConfig.cor_tema);

                const ownerId = configData.usuario_id;
                if (ownerId) {
                    // Checa se o plano do dono está expirado ou inativo
                    let ownerExpired = false;
                    try {
                        const { data: ownerUser, error: ownerErr } = await supabaseClient
                            .from('usuarios')
                            .select('plan, plan_expires_at, status')
                            .eq('id', ownerId)
                            .maybeSingle();

                        if (!ownerErr && ownerUser) {
                            const plan = ownerUser.plan || 'Trial';
                            const expires = ownerUser.plan_expires_at ? new Date(ownerUser.plan_expires_at) : null;
                            const isTrialExpired = plan === 'Trial' && expires && new Date() > expires;
                            const isInativo = ownerUser.status === 'Inativo';
                            if (isTrialExpired || isInativo) {
                                ownerExpired = true;
                            }
                        }
                    } catch (e) {
                        console.error("Erro ao validar status do plano do dono:", e);
                    }
                    state.storeConfig.ownerExpired = ownerExpired;

                    // Busca APENAS os produtos do dono dessa loja
                    const { data: prodData, error: prodErr } = await supabaseClient
                        .from('produtos')
                        .select('*')
                        .eq('usuario_id', ownerId);

                    if (prodErr) throw prodErr;

                    state.products = (prodData || []).map(p => ({
                        id: p.id,
                        name: p.name || "Sem nome",
                        price: parseFloat(p.price) || 0,
                        category: p.category || "Geral",
                        desc: p.desc || p.description || "",
                        emoji: p.emoji || "🧁",
                        recipeId: p.recipe_id || null,
                        destacado: p.destacado || false,
                        badgeDestaque: p.badge_destaque || "",
                        photo: p.photo || ""
                    }));
                } else {
                    console.warn("Loja sem usuario_id configurado.");
                    state.products = [];
                }
            } else {
                console.warn("Loja com slug não cadastrado no Supabase:", storefrontSlug);
                state.products = [];
                state.storeConfig = {
                    name: "Loja não encontrada",
                    slug: storefrontSlug,
                    phone: "",
                    hours: "",
                    logo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop",
                    banner: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=400&fit=crop",
                    desc: "Esta loja ainda não foi configurada pelo proprietário.",
                    cor_tema: "#ff7eb9"
                };
                applyStorefrontThemeColor(state.storeConfig.cor_tema);
            }

            // Não salvar no LocalStorage para não sobrescrever os dados locais do visitante com a loja visitada.
            // Apenas atualizamos o form por precaução.
            populateStoreForm();

        } catch (err) {
            console.error("Falha ao carregar dados do Cardápio Digital:", err);
            isSupabaseActive = false; // Fallback
        } finally {
            hideLoadingIndicator();
            if (document.body.classList.contains("standalone-storefront-mode")) {
                openMenuPreview();
            }
        }
        return; // Finaliza prematuramente para não vazar nenhum outro dado
    }

    // 2. MODO PAINEL / APP: Carregamento isolado e com controle de inquilino
    try {
        const loggedInUserId = getLoggedInUserId();
        
        // Identificar privilégios de Super Admin
        const session = localStorage.getItem("confeitaai_session");
        let userRole = "";
        if (session) {
            try {
                userRole = JSON.parse(session).role || "";
            } catch (e) { console.error("Erro silenciado capturado:", e); }
        }
        const isSuperAdmin = userRole === "Super Admin";
        const isImpersonating = isSuperAdmin && !!localStorage.getItem("confeitaai_impersonated_user_id");

        // Construir queries filtradas pelo inquilino ativo
        let prodQuery = supabaseClient.from('produtos').select('*');
        let clientQuery = supabaseClient.from('clientes').select('*');
        let stockQuery = supabaseClient.from('estoque').select('*');
        let orderQuery = supabaseClient.from('pedidos').select('*');
        let transQuery = supabaseClient.from('transacoes').select('*');
        let recipeQuery = supabaseClient.from('receitas').select('*');
        let msgQuery = supabaseClient.from('mensagens_cacau').select('*').order('created_at', { ascending: true });
        let configQuery = supabaseClient.from('configuracoes').select('*');
        let userQuery = supabaseClient.from('usuarios').select('*');
        let fiadoQuery = supabaseClient.from('fiados').select('*');

        if (loggedInUserId) {
            configQuery = configQuery.eq('usuario_id', loggedInUserId);
            prodQuery = prodQuery.eq('usuario_id', loggedInUserId);
            clientQuery = clientQuery.eq('usuario_id', loggedInUserId);
            stockQuery = stockQuery.eq('usuario_id', loggedInUserId);
            orderQuery = orderQuery.eq('usuario_id', loggedInUserId);
            transQuery = transQuery.eq('usuario_id', loggedInUserId);
            recipeQuery = recipeQuery.eq('usuario_id', loggedInUserId);
            msgQuery = msgQuery.eq('usuario_id', loggedInUserId);
            fiadoQuery = fiadoQuery.eq('usuario_id', loggedInUserId);

            if (!isSuperAdmin || isImpersonating) {
                // Uma confeiteira/auxiliar só vê a si mesma e aos colaboradores sob o mesmo tenant
                userQuery = userQuery.or(`usuario_id.eq.${loggedInUserId},id.eq.${loggedInUserId}`);
            }
        } else {
            // Se não estiver logado, não carregar nenhum usuário na memória para total segurança!
            userQuery = supabaseClient.from('usuarios').select('*').eq('id', 'non_existent_id');
        }

        // Executar todas as queries em paralelo
        const [
            { data: prodData, error: prodErr },
            { data: clientData, error: clientErr },
            { data: stockData, error: stockErr },
            { data: orderData, error: orderErr },
            { data: transData, error: transErr },
            { data: recipeData, error: recipeErr },
            { data: msgData, error: msgErr },
            { data: fiadoData, error: fiadoErr },
            userResult,
            storeConfigResult
        ] = await Promise.all([
            prodQuery,
            clientQuery,
            stockQuery,
            orderQuery,
            transQuery,
            recipeQuery,
            msgQuery,
            fiadoQuery.then(res => res, err => ({ data: [], error: err })),
            userQuery.then(res => res, err => ({ data: null, error: err })),
            configQuery.limit(1).maybeSingle().then(res => res, err => ({ data: null, error: err }))
        ]);

        if (prodErr || clientErr || stockErr || orderErr || transErr || recipeErr || msgErr) {
            throw new Error("Erro nas tabelas");
        }

        // Carregar colaboradores com segurança
        let userData = [];
        if (userResult && userResult.data) {
            userData = userResult.data;
        } else {
            console.warn("Tabela 'usuarios' não existe no Supabase ou falhou. Usando seed local.");
            userData = JSON.parse(JSON.stringify(seedData.users));
        }

        // Map database tables to application state
        state.products = (prodData || []).map(p => ({
            id: p.id,
            name: p.name || "Sem nome",
            price: parseFloat(p.price) || 0,
            category: p.category || "Geral",
            desc: p.desc || p.description || "",
            emoji: p.emoji || "🧁",
            recipeId: p.recipe_id || null,
            destacado: p.destacado || false,
            badgeDestaque: p.badge_destaque || "",
            photo: p.photo || ""
        }));
        state.users = userData || [];
        
        state.clients = (clientData || []).map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            orderCount: c.order_count || 0,
            totalSpent: parseFloat(c.total_spent) || 0
        }));

        state.ingredients = (stockData || []).map(i => ({
            id: i.id,
            name: i.name,
            qty: parseFloat(i.qty) || 0,
            unit: i.unit,
            min: parseFloat(i.min) || 0,
            price: parseFloat(i.price) || 0
        }));

        state.orders = (orderData || []).map(o => ({
            id: o.id,
            clientId: o.client_id,
            productId: o.product_id,
            qty: o.qty,
            val: parseFloat(o.val) || 0,
            date: o.date,
            time: o.time ? o.time.substring(0, 5) : "12:00",
            status: o.status,
            notes: o.notes
        }));

        state.transactions = (transData || []).map(t => ({
            id: t.id,
            date: t.date,
            desc: t.desc,
            type: t.type,
            category: t.category,
            val: parseFloat(t.val) || 0
        }));

        state.recipes = (recipeData || []).map(r => ({
            id: r.id,
            name: r.name,
            yield: r.yield,
            ingredients: r.ingredients || [],
            margin: parseFloat(r.margin) || 0,
            prep_time: r.prep_time !== undefined && r.prep_time !== null ? parseFloat(r.prep_time) : 1.0,
            labor_rate: r.labor_rate !== undefined && r.labor_rate !== null ? parseFloat(r.labor_rate) : DEFAULT_HOURLY_RATE,
            gas_cost: r.gas_cost !== undefined && r.gas_cost !== null ? parseFloat(r.gas_cost) : 2.00,
            packaging_cost: r.packaging_cost !== undefined && r.packaging_cost !== null ? parseFloat(r.packaging_cost) : 5.00,
            fixed_overhead: r.fixed_overhead !== undefined && r.fixed_overhead !== null ? parseFloat(r.fixed_overhead) : 1.00
        }));

        state.cacauMessages = (msgData || []).map(m => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            time: m.time
        }));

        state.fiados = (fiadoData || []).map(f => ({
            id: f.id,
            clientName: f.client_name,
            clientId: f.client_id,
            date: f.date,
            dueDate: f.due_date,
            description: f.description,
            totalVal: parseFloat(f.total_val) || 0,
            status: f.status,
            type: f.type
        }));

        // If mensajes_cacau are empty on fresh Supabase project, auto-seed them
        if (state.cacauMessages.length === 0) {
            const initialMsgs = [
                { id: "m1", sender: "cacau", text: "Olá! Seja muito bem-vinda ao **ConfeitaAI**! Eu sou a **Cacau**, sua assistente inteligente. 🍰", time: "18:50" },
                { id: "m2", sender: "cacau", text: "Estou conectada ao seu banco de dados na nuvem com o **Supabase**! Agora tudo o que você me pedir ficará salvo online de verdade. 🌐", time: "18:51" }
            ];
            for (const m of initialMsgs) {
                const payload = { id: m.id, sender: m.sender, text: m.text, time: m.time };
                if (loggedInUserId) {
                    payload.usuario_id = loggedInUserId;
                }
                await supabaseClient.from('mensagens_cacau').insert([payload]);
            }
            state.cacauMessages = initialMsgs;
        }

        let configData = null;
        if (storeConfigResult && storeConfigResult.data) {
            configData = storeConfigResult.data;
        } else if (loggedInUserId) {
            // Se o usuário está logado mas não possui registro em 'configuracoes',
            // criamos uma configuração padrão automática baseada no seu username/nome.
            const userObj = (userData || []).find(u => u.id === loggedInUserId) || {};
            const defaultSlug = userObj.username || ("confeiteira_" + loggedInUserId.substring(0, 5));
            const defaultName = userObj.name ? ("Doces da " + userObj.name.split(' ')[0]) : "Minha Confeitaria";
            
            const defaultPayload = {
                id: loggedInUserId,
                usuario_id: loggedInUserId,
                name: defaultName,
                slug: defaultSlug,
                phone: "",
                hours: "Horário a combinar",
                logo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop",
                banner: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=400&fit=crop",
                desc: "Bem-vinda à nossa loja! Em breve configuraremos nosso cardápio completo."
            };

            console.log("Nenhuma configuração encontrada. Criando configuração padrão para:", defaultSlug);
            try {
                const { data: insertedData, error: insertErr } = await supabaseClient
                    .from('configuracoes')
                    .insert([defaultPayload])
                    .select()
                    .maybeSingle();

                if (insertErr) {
                    console.error("Erro ao auto-criar configurações padrão:", insertErr);
                    configData = defaultPayload;
                } else if (insertedData) {
                    configData = insertedData;
                    console.log("Configuração padrão criada com sucesso no banco de dados.");
                } else {
                    configData = defaultPayload;
                }
            } catch (e) {
                console.error("Erro de conexão ao auto-criar configurações padrão:", e);
                configData = defaultPayload;
            }
        }

        if (configData) {
            state.storeConfig = {
                name: configData.name || state.storeConfig.name,
                slug: configData.slug || state.storeConfig.slug,
                phone: configData.phone || state.storeConfig.phone,
                hours: configData.hours || state.storeConfig.hours,
                logo: configData.logo || state.storeConfig.logo,
                banner: configData.banner || state.storeConfig.banner,
                desc: configData.desc || state.storeConfig.desc,
                cor_tema: configData.cor_tema || state.storeConfig.cor_tema || "#ff7eb9",
                loja_aberta: configData.loja_aberta !== false,
                cake_builder: configData.cake_builder || null
            };
            applyStorefrontThemeColor(state.storeConfig.cor_tema);
        }

        // Save fresh fetched state to local storage cache
        saveToLocalStorage();
        populateStoreForm();

    } catch (err) {
        console.error("Falha de conexão com o Supabase, ativando fallback local:", err);
        isSupabaseActive = false; // Disable flag and fall back
    } finally {
        hideLoadingIndicator();
        checkSession();
        if (document.body.classList.contains("standalone-storefront-mode")) {
            openMenuPreview();
        }
    }
}

function renderActiveTab() {
    const currentActiveTab = document.querySelector(".sidebar-menu a.active, .cacau-shortcut-btn.active")?.getAttribute("data-tab") || "dashboard";
    switchTab(currentActiveTab);
}

// ================= AUTHENTICATION & SESSION CONTROL =================
async function checkSession() {
    if (document.body.classList.contains("standalone-storefront-mode")) {
        const loginContainer = document.getElementById("login-container");
        if (loginContainer) loginContainer.style.display = "none";
        return true;
    }

    function showLogin() {
        localStorage.removeItem("confeitaai_session");
        document.getElementById("login-container").style.display = "flex";
        return false;
    }

    function applyUserToUI(profile) {
        const sessionData = { id: profile.id, email: profile.email, username: profile.username, name: profile.name, role: profile.role, plan: profile.plan, plan_expires_at: profile.plan_expires_at };
        localStorage.setItem("confeitaai_session", JSON.stringify(sessionData));
        document.getElementById("login-container").style.display = "none";
        const greetingEl = document.getElementById("logged-user-greeting");
        if (greetingEl) {
            greetingEl.innerHTML = `Olá, <strong>${profile.name}</strong>! 👋 <span class="role-badge role-badge-${profile.role.toLowerCase().replaceAll(" ", "-")}">${profile.role}</span>`;
        }
        const planBadgeEl = document.getElementById("user-plan-badge");
        if (planBadgeEl && profile.role !== 'Super Admin') {
            const currentPlan = profile.plan || 'TESTE';
            planBadgeEl.textContent = currentPlan.toUpperCase();
            if (currentPlan.toUpperCase() === 'PRO') {
                planBadgeEl.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                planBadgeEl.style.color = 'white';
                planBadgeEl.style.border = 'none';
            } else {
                planBadgeEl.style.background = 'rgba(139, 92, 246, 0.1)';
                planBadgeEl.style.color = 'var(--color-purple)';
                planBadgeEl.style.border = '1px solid rgba(139, 92, 246, 0.2)';
            }
            planBadgeEl.style.display = 'inline-block';
        } else if (planBadgeEl) {
            planBadgeEl.style.display = 'none';
        }
        applyPermissions(profile.role);

        // Configura notificações em tempo real para novos pedidos
        if (isSupabaseActive && profile.id) {
            setupRealtimeNotifications(profile.id);
            requestNotificationPermission();
        }

        // Update last_login silently
        const nowStr = new Date().toISOString();
        if (isSupabaseActive && profile.id) {
            supabaseClient.from('usuarios').update({ last_login: nowStr }).eq('id', profile.id).then(() => {});
        }
        const localUser = state.users.find(u => u.id === profile.id);
        if (localUser) {
            localUser.last_login = nowStr;
            saveToLocalStorage();
        }

        // Check trial expiry (skip for Super Admin)
        if (profile.role !== 'Super Admin') {
            const plan = profile.plan || 'Trial';
            const expires = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
            const isTrialExpired = plan === 'Trial' && expires && new Date() > expires;
            const isInativo = profile.status === 'Inativo';
            
            if (isTrialExpired || isInativo) {
                showTrialExpiredModal(isInativo && plan === 'PRO');
                return true;
            }
            // Show trial countdown badge if within 3 days
            if (plan === 'Trial' && expires) {
                const daysLeft = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24));
                if (daysLeft <= 3 && daysLeft > 0) {
                    const badge = document.createElement('div');
                    badge.id = 'trial-countdown-banner';
                    badge.style.cssText = 'background:linear-gradient(90deg,#f59e0b,#ef4444);color:white;text-align:center;padding:10px 16px;font-size:13px;font-weight:600;z-index:9999;position:relative;width:100%;flex-shrink:0;box-sizing:border-box;';
                    badge.innerHTML = `⏳ Seu período de teste termina em <strong>${daysLeft} dia${daysLeft > 1 ? 's' : ''}</strong>! <a href="#" onclick="showTrialExpiredModal()" style="color:white;text-decoration:underline;margin-left:8px;">Assinar Plano PRO →</a>`;
                    if (!document.getElementById('trial-countdown-banner')) {
                        const workspace = document.querySelector('.main-workspace');
                        if (workspace) {
                            workspace.prepend(badge);
                        } else {
                            document.body.prepend(badge);
                        }
                    }
                }
            }
        }

        renderActiveTab();
        checkAndRenderImpersonationBanner();

        // 🎓 Verificar e iniciar tutorial de onboarding para novos usuários
        setTimeout(() => checkAndStartTutorial(profile.email), 800);

        return true;
    }

    // =====================================================
    // 🎓 TUTORIAL DE ONBOARDING (GUIDED TOUR)
    // =====================================================

    const TOUR_STEPS = [
        {
            tab: "dashboard",
            icon: "📊",
            title: "Painel Geral",
            description: "Aqui é a sua central de comando! Veja um resumo de faturamento, pedidos pendentes, clientes e muito mais — tudo numa só tela."
        },
        {
            tab: "encomendas",
            icon: "🎂",
            title: "Encomendas",
            description: "Gerencie seus pedidos num quadro visual (Kanban). Mova as encomendas de 'Recebido' até 'Entregue' e nunca perca um prazo."
        },
        {
            tab: "cardapio",
            icon: "🍰",
            title: "Cardápio Digital",
            description: "Monte sua vitrine online! Configure seus produtos e compartilhe o link exclusivo da sua loja com seus clientes."
        },
        {
            tab: "estoque",
            icon: "📦",
            title: "Estoque Inteligente",
            description: "Cadastre seus ingredientes, defina um mínimo de alerta e a Cacau te avisa quando estiver acabando. Também gera lista de compras automaticamente!"
        },
        {
            tab: "receitas",
            icon: "📖",
            title: "Receitas & Precificação",
            description: "Crie suas fichas técnicas, vincule ingredientes e descubra exatamente quanto custa cada receita. Nunca mais venda no prejuízo!"
        },
        {
            tab: "clientes",
            icon: "👩‍👩‍👧",
            title: "Gestão de Clientes",
            description: "Sua lista de clientes completa com histórico de pedidos e total gasto. Fidelização começa com organização!"
        },
        {
            tab: "cacau-chat",
            icon: "🤖",
            title: "Cacau — Sua IA",
            description: "Converse com a Cacau como se fosse o WhatsApp! Peça relatórios, cadastre pedidos, veja o estoque e muito mais usando linguagem natural. Ela é sua assistente 24h!"
        },
        {
            tab: "calendario",
            icon: "📅",
            title: "Calendário",
            description: "Veja todas as suas entregas em formato de agenda. Assim você sabe exatamente os seus dias mais cheios e pode se programar com antecedência."
        }
    ];

    let currentTourStep = 0;

    function checkAndStartTutorial(userEmail) {
        if (!userEmail) return;
        const tourKey = `confeitaai_tour_${userEmail}`;
        const alreadySeen = localStorage.getItem(tourKey);
        if (!alreadySeen) {
            startTutorial(userEmail);
        }
    }

    function startTutorial(userEmail) {
        currentTourStep = 0;
        renderTourModal(userEmail);
        showTourStep(0);
    }

    function renderTourModal(userEmail) {
        // Remove any existing tour modal
        const existing = document.getElementById('confeitaai-tour-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'confeitaai-tour-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999999;
            pointer-events: none;
            display: flex; align-items: flex-end; justify-content: center;
            padding: 24px;
        `;

        overlay.innerHTML = `
            <!-- Spotlight backdrop (top half) -->
            <div id="tour-backdrop" style="
                position: fixed; inset: 0;
                background: rgba(15, 10, 30, 0.55);
                backdrop-filter: blur(2px);
                pointer-events: all;
            "></div>

            <!-- Tour Card -->
            <div id="tour-card" style="
                position: relative; z-index: 1;
                background: linear-gradient(135deg, #1e1040 0%, #2d1a6e 100%);
                border: 1px solid rgba(139,92,246,0.5);
                border-radius: 24px;
                padding: 32px 28px 24px;
                max-width: 480px; width: 100%;
                box-shadow: 0 30px 80px rgba(139,92,246,0.35), 0 0 0 1px rgba(255,255,255,0.06);
                color: white;
                font-family: inherit;
                pointer-events: all;
                animation: tourSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            ">
                <!-- Progress bar -->
                <div style="display: flex; gap: 6px; margin-bottom: 22px;">
                    ${TOUR_STEPS.map((_, i) => `
                        <div class="tour-dot" data-index="${i}" style="
                            flex: 1; height: 3px; border-radius: 10px;
                            background: ${i === 0 ? 'rgba(167,139,250,1)' : 'rgba(255,255,255,0.15)'};
                            transition: background 0.3s;
                        "></div>
                    `).join('')}
                </div>

                <!-- Icon + Content -->
                <div id="tour-icon" style="font-size: 44px; margin-bottom: 12px; animation: none;"></div>
                <h2 id="tour-title" style="font-size: 22px; font-weight: 700; margin: 0 0 10px; color: #e9d5ff;"></h2>
                <p id="tour-desc" style="font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.75); margin: 0 0 24px;"></p>

                <!-- Step counter -->
                <p id="tour-counter" style="font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 16px; text-align: center;"></p>

                <!-- Buttons -->
                <div style="display: flex; gap: 12px;">
                    <button id="btn-tour-skip" onclick="skipTutorial('${userEmail}')" style="
                        flex: 1; padding: 12px; border-radius: 12px;
                        background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
                        color: rgba(255,255,255,0.6); font-size: 14px; cursor: pointer;
                        transition: all 0.2s; font-weight: 500; font-family: inherit;
                    " onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.07)'">
                        Pular tutorial
                    </button>
                    <button id="btn-tour-next" onclick="nextTourStep('${userEmail}')" style="
                        flex: 2; padding: 12px; border-radius: 12px;
                        background: linear-gradient(135deg, #7c3aed, #a855f7);
                        border: none; color: white; font-size: 14px; font-weight: 700;
                        cursor: pointer; transition: all 0.2s; font-family: inherit;
                        box-shadow: 0 4px 20px rgba(139,92,246,0.4);
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        Próximo →
                    </button>
                </div>
            </div>
        `;

        // Inject keyframe animation
        if (!document.getElementById('tour-styles')) {
            const style = document.createElement('style');
            style.id = 'tour-styles';
            style.innerHTML = `
                @keyframes tourSlideUp {
                    from { opacity: 0; transform: translateY(40px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes tourIconBounce {
                    0%   { transform: scale(1); }
                    40%  { transform: scale(1.25) rotate(-6deg); }
                    70%  { transform: scale(0.95) rotate(4deg); }
                    100% { transform: scale(1) rotate(0deg); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
    }

    function showTourStep(index) {
        const step = TOUR_STEPS[index];
        if (!step) return;

        // Switch tab to highlight it
        switchTab(step.tab);

        // Update card content
        const iconEl = document.getElementById('tour-icon');
        const titleEl = document.getElementById('tour-title');
        const descEl  = document.getElementById('tour-desc');
        const counter = document.getElementById('tour-counter');
        const nextBtn = document.getElementById('btn-tour-next');

        if (iconEl) {
            iconEl.textContent = step.icon;
            iconEl.style.animation = 'none';
            void iconEl.offsetWidth; // reflow to restart animation
            iconEl.style.animation = 'tourIconBounce 0.5s ease';
        }
        if (titleEl) titleEl.textContent = step.title;
        if (descEl)  descEl.textContent  = step.description;
        if (counter) counter.textContent  = `${index + 1} de ${TOUR_STEPS.length}`;
        if (nextBtn) nextBtn.textContent  = index === TOUR_STEPS.length - 1 ? '🎉 Começar a usar!' : 'Próximo →';

        // Update progress dots
        document.querySelectorAll('.tour-dot').forEach((dot, i) => {
            dot.style.background = i <= index ? 'rgba(167,139,250,1)' : 'rgba(255,255,255,0.15)';
        });

        currentTourStep = index;
    }

    window.nextTourStep = function(userEmail) {
        const next = currentTourStep + 1;
        if (next >= TOUR_STEPS.length) {
            skipTutorial(userEmail);
        } else {
            showTourStep(next);
        }
    };

    window.skipTutorial = function(userEmail) {
        if (userEmail) {
            localStorage.setItem(`confeitaai_tour_${userEmail}`, '1');
        }
        const overlay = document.getElementById('confeitaai-tour-overlay');
        if (overlay) {
            overlay.style.transition = 'opacity 0.3s';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
        // Return to dashboard after tutorial
        switchTab('dashboard');
    };


    function showTrialExpiredModal(isProInactive) {
        let modal = document.getElementById('modal-trial-expired');
        const title = isProInactive ? "Sua assinatura está inativa!" : "Seu período de teste acabou!";
        const desc = isProInactive ? "Renove sua assinatura PRO para voltar a ter acesso ao ConfeitaAI." : "Para continuar usando o ConfeitaAI com todos os recursos de estoque, cardápio digital e a IA Cacau, assine o Plano PRO.";
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-trial-expired';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);';
            modal.innerHTML = `
                <div style="background:white;border-radius:24px;padding:40px;max-width:480px;width:100%;text-align:center;box-shadow:0 30px 60px rgba(0,0,0,0.3);">
                    <div style="font-size:60px;margin-bottom:16px;">🔒</div>
                    <h2 id="trial-modal-title" style="font-size:24px;font-weight:800;margin-bottom:12px;color:#1e293b;">${title}</h2>
                    <p id="trial-modal-desc" style="color:#64748b;font-size:15px;margin-bottom:28px;line-height:1.6;">${desc}</p>
                    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:16px;padding:24px;margin-bottom:24px;">
                        <div style="color:white;font-size:14px;opacity:0.8;margin-bottom:4px;">Plano PRO</div>
                        <div style="color:white;font-size:42px;font-weight:800;">R$ 29,90<span style="font-size:16px;font-weight:400;">/mês</span></div>
                        <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:8px;">Pedidos ilimitados • IA ilimitada • Suporte prioritário</div>
                    </div>
                    <button onclick="window.open('https://pay.kiwify.com.br/lH5Lp1S','_blank')" style="width:100%;padding:14px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:12px;">✨ Assinar Agora</button>
                    <button onclick="supabaseClient?.auth.signOut().then(()=>location.reload())" style="width:100%;padding:12px;background:none;border:1px solid #e2e8f0;border-radius:12px;font-size:14px;color:#64748b;cursor:pointer;">Sair da conta</button>
                </div>`;
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
    }
    window.showTrialExpiredModal = showTrialExpiredModal;

    // Modo online: Supabase Auth é a fonte da verdade
    if (isSupabaseActive) {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return showLogin();

            // Busca perfil na tabela usuarios
            let { data: profile } = await supabaseClient
                .from('usuarios')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            // Se perfil não existe (usuário antigo ou trigger falhou), cria automaticamente
            if (!profile) {
                const name = session.user.user_metadata?.name || session.user.email.split('@')[0];
                const username = session.user.user_metadata?.username || session.user.email.split('@')[0].toLowerCase();
                const trialExpires = new Date();
                trialExpires.setDate(trialExpires.getDate() + 7);
                const newProfile = {
                    id: session.user.id,
                    name,
                    email: session.user.email,
                    username,
                    role: 'Confeiteira',
                    status: 'Ativo',
                    usuario_id: session.user.id,
                    plan: 'Trial',
                    plan_expires_at: trialExpires.toISOString(),
                    last_login: new Date().toISOString()
                };
                const { data: created } = await supabaseClient.from('usuarios').insert([newProfile]).select().maybeSingle();
                profile = created || newProfile;
            }

            if (profile.status !== 'Ativo') {
                await supabaseClient.auth.signOut();
                return showLogin();
            }

            return applyUserToUI(profile);
        } catch (e) {
            console.error("Erro ao verificar sessão Supabase:", e);
            return showLogin();
        }
    }

    // Modo offline: usa cache local
    const sessionStr = localStorage.getItem("confeitaai_session");
    if (!sessionStr) return showLogin();
    try {
        const sessionData = JSON.parse(sessionStr);
        const user = state.users.find(u => u.email && u.email.toLowerCase() === sessionData.email?.toLowerCase());
        if (!user || user.status !== "Ativo") return showLogin();
        return applyUserToUI(user);
    } catch (e) {
        return showLogin();
    }
}

// ================= REAL-TIME NOTIFICATIONS SYSTEM =================
let pedidosSubscription = null;

function setupRealtimeNotifications(userId) {
    if (!isSupabaseActive || !supabaseClient || !userId) return;
    
    // Evita duplicidade limpando canal anterior se houver
    if (pedidosSubscription) {
        try {
            supabaseClient.removeChannel(pedidosSubscription);
        } catch (e) {
            console.error("Erro ao remover canal anterior:", e);
        }
    }
    
    console.log("Configurando escuta em tempo real para novos pedidos do usuário:", userId);
    
    pedidosSubscription = supabaseClient
        .channel('pedidos-realtime-changes')
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'pedidos', 
                filter: `usuario_id=eq.${userId}` 
            },
            (payload) => {
                console.log('Novo pedido detectado em tempo real:', payload.new);
                handleNewOrderNotification(payload.new);
            }
        )
        .subscribe((status) => {
            console.log("Inscrito no canal de pedidos realtime. Status:", status);
        });
}

function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
            console.log("Permissão de notificações do sistema:", permission);
        });
    }
}

async function handleNewOrderNotification(newOrder) {
    if (!newOrder || !newOrder.id) return;
    
    // Evita duplicar pedidos que já foram carregados
    const exists = state.orders.some(o => o.id === newOrder.id || o.id === String(newOrder.id));
    if (exists) return;
    
    // Converte o pedido do banco de dados para o modelo do frontend
    const mappedOrder = {
        id: String(newOrder.id),
        clientId: newOrder.client_id,
        productId: newOrder.product_id,
        qty: parseInt(newOrder.qty) || 1,
        val: parseFloat(newOrder.val) || 0,
        date: newOrder.date,
        time: newOrder.time ? newOrder.time.substring(0, 5) : "12:00",
        status: newOrder.status || "Recebido",
        notes: newOrder.notes || ""
    };
    
    // Garante que o cliente associado esteja carregado localmente para podermos exibir o nome correto
    let client = state.clients.find(c => c.id === mappedOrder.clientId);
    if (!client && mappedOrder.clientId && isSupabaseActive) {
        try {
            const { data: dbClient, error } = await supabaseClient
                .from('clientes')
                .select('*')
                .eq('id', mappedOrder.clientId)
                .maybeSingle();
                
            if (dbClient && !error) {
                client = {
                    id: dbClient.id,
                    name: dbClient.name,
                    phone: dbClient.phone,
                    orderCount: dbClient.order_count || 0,
                    totalSpent: parseFloat(dbClient.total_spent) || 0
                };
                state.clients.push(client);
            }
        } catch (err) {
            console.error("Erro ao sincronizar cliente em tempo real:", err);
        }
    }
    
    const clientName = client ? client.name : "Sem Nome";
    
    // Adiciona o novo pedido no início da lista local
    state.orders.unshift(mappedOrder);
    saveToLocalStorage();
    
    // Toca som de notificação (Cash Register / Chime digital feito com Web Audio API)
    playNotificationSound();
    
    // Dispara Toast In-app
    showToastNotification(
        `🧁 Novo Pedido Recebido!`,
        `Pedido #${mappedOrder.id} - ${clientName} (R$ ${mappedOrder.val.toFixed(2)})`,
        () => {
            // Se clicar no Toast, muda para a aba de encomendas
            switchTab("encomendas");
        }
    );
    
    // Dispara notificação nativa do sistema (Desktop/Android)
    showSystemNotification(
        `🧁 Novo Pedido - ConfeitaAI`,
        `Pedido #${mappedOrder.id} de ${clientName} no valor de R$ ${mappedOrder.val.toFixed(2)}`
    );
    
    // Atualiza as interfaces em tempo real sem precisar de reload
    try {
        updateOverviewStats();
        renderPedidos();
        renderActiveTab();
    } catch (e) {
        console.error("Erro ao atualizar interface após notificação:", e);
    }
}

function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const playTone = (freq, delay, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
            
            gain.gain.setValueAtTime(0, ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
            
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + duration);
        };
        
        // Som digital de sininho (duplo acorde agradável)
        playTone(587.33, 0, 0.25);      // D5
        playTone(880.00, 0.12, 0.35);    // A5
    } catch (e) {
        console.error("Falha ao tocar som de notificação:", e);
    }
}

function showToastNotification(title, message, onClick) {
    let container = document.getElementById('toast-notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-notification-container';
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'in-app-toast';
    toast.style.cssText = `
        background: white;
        color: #1f2937;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        border-left: 5px solid var(--color-purple, #8b5cf6);
        min-width: 320px;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        pointer-events: auto;
        cursor: pointer;
        transform: translateY(50px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    `;
    
    toast.innerHTML = `
        <div style="font-weight: bold; font-size: 15px; color: var(--color-purple, #8b5cf6); display: flex; align-items: center; gap: 8px;">
            <span>${title}</span>
        </div>
        <div style="font-size: 13px; color: #4b5563;">${message}</div>
    `;
    
    if (onClick) {
        toast.onclick = () => {
            onClick();
            dismiss();
        };
    }
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 50);
    
    const dismiss = () => {
        toast.style.transform = 'translateY(-20px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    };
    
    // Auto-dismiss após 7 segundos
    const timerId = setTimeout(dismiss, 7000);
    
    // Permite fechar clicando no próprio toast se não tiver ação de clique
    if (!onClick) {
        toast.onclick = dismiss;
    }
}

function showSystemNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            const options = {
                body: body,
                icon: 'https://confeita-ai.vercel.app/50-doces-dbtfno8m9v.webp',
                tag: 'new-order-confeitaai' // Agrupa notificações se vierem várias
            };
            new Notification(title, options);
        } catch (e) {
            console.error("Erro ao disparar notificação de sistema:", e);
        }
    }
}

let lastLoginUpdateTimestamp = 0;

async function updateLastLoginSilently() {
    if (!isSupabaseActive || !supabaseClient) return;
    const userId = getLoggedInUserId();
    if (!userId) return;
    
    const now = Date.now();
    // Throttle: Apenas atualiza no máximo a cada 5 minutos para economizar recursos do banco
    if (now - lastLoginUpdateTimestamp < 5 * 60 * 1000) return;
    lastLoginUpdateTimestamp = now;
    
    try {
        const nowStr = new Date().toISOString();
        await supabaseClient.from('usuarios').update({ last_login: nowStr }).eq('id', userId);
        
        // Atualiza no cache de memória local também
        const localUser = state.users.find(u => u.id === userId);
        if (localUser) {
            localUser.last_login = nowStr;
            saveToLocalStorage();
        }
    } catch (e) {
        console.error("Erro silencioso ao atualizar last_login:", e);
    }
}

// Escutar eventos de foco e atividade para atualizar o acesso administrativo
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        updateLastLoginSilently();
    }
});

window.addEventListener("focus", () => {
    updateLastLoginSilently();
});


async function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const errorEl = document.getElementById("login-error-msg");
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    if (!email || !password) return;

    if (!isSupabaseActive) {
        const user = state.users.find(u => u.email && u.email.toLowerCase() === email && u.password === password);
        if (!user || user.status !== "Ativo") {
            if (errorEl) { errorEl.innerText = "❌ Usuário ou senha incorretos!"; errorEl.style.display = "block"; }
            return;
        }
        localStorage.setItem("confeitaai_session", JSON.stringify({ id: user.id, email: user.email, username: user.username, name: user.name, role: user.role }));
        document.getElementById("login-container").style.display = "none";
        await checkSession();
        await loadState();
        return;
    }

    try {
        showLoadingIndicator();
        if (errorEl) errorEl.style.display = "none";
        const { data: authData, error: authErr } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (authErr) throw authErr;
        emailInput.value = "";
        passwordInput.value = "";
        document.getElementById("login-container").style.display = "none";
        await checkSession();
        await loadState();
    } catch (err) {
        console.error("Erro no login:", err);
        if (errorEl) {
            errorEl.innerText = err.message.includes("Email not confirmed") ? "❌ Confirme seu e-mail!" : "❌ E-mail ou senha incorretos!";
            errorEl.style.display = "block";
        }
    } finally {
        hideLoadingIndicator();
    }
}

async function handleLogout() {
    if (isSupabaseActive) {
        try {
            await supabaseClient.auth.signOut();
        } catch (e) { console.error("Erro no signOut", e); }
    }
    localStorage.removeItem("confeitaai_session");
    // Limpa estado em memória para evitar qualquer vazamento de dados confidenciais
    state = sanitizeAndMergeState(emptyState);
    
    const loginContainer = document.getElementById("login-container");
    if (loginContainer) loginContainer.style.display = "flex";
    // Always show login panel on logout
    const loginPanel = document.getElementById("login-form-panel");
    const setupPanel = document.getElementById("setup-form-panel");
    if (loginPanel) loginPanel.style.display = "block";
    if (setupPanel) setupPanel.style.display = "none";
    const greetingEl = document.getElementById("logged-user-greeting");
    if (greetingEl) greetingEl.innerHTML = "Olá, <strong>Confeiteira</strong>! 👋";
    switchTab("dashboard");
}

async function handleSetupSubmit(e) {
    e.preventDefault();
    const fullName = document.getElementById("setup-fullname").value.trim();
    const email = document.getElementById("setup-email").value.trim().toLowerCase();
    const phone = document.getElementById("setup-phone").value.trim();
    let username = document.getElementById("setup-username").value.trim().toLowerCase().replace(/\s+/g, "");
    if (username.includes("@")) {
        username = username.split("@")[0];
    }
    username = username.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-_.]/g, "");
    const password = document.getElementById("setup-password").value;
    const confirm  = document.getElementById("setup-password-confirm").value;
    const errEl    = document.getElementById("setup-error-msg");

    function showSetupError(msg) {
        errEl.textContent = "❌ " + msg;
        errEl.style.display = "block";
    }

    if (!fullName || !email || !phone || !username || !password || !confirm) return showSetupError("Preencha todos os campos obrigatórios.");
    if (username.length < 3) return showSetupError("O nome de usuário deve ter pelo menos 3 caracteres.");
    if (password.length < 6) return showSetupError("A senha deve ter pelo menos 6 caracteres.");
    if (password !== confirm) return showSetupError("As senhas não coincidem. Tente novamente.");

    // Clean and validate phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
        return showSetupError("Por favor, informe um WhatsApp válido com DDD (ex: 11999998888).");
    }

    let finalPhone = cleanPhone;
    if (finalPhone.length <= 11) {
        finalPhone = "55" + finalPhone;
    }

    errEl.style.display = "none";

    if (!isSupabaseActive) {
        return showSetupError("Sem conexão com o servidor. O cadastro requer internet.");
    }

    try {
        showLoadingIndicator();
        // 1. Cadastra no Supabase Auth — o Trigger do banco cria o perfil em 'usuarios' automaticamente
        const { data: authData, error: authErr } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { name: fullName, username, phone: finalPhone } }
        });

        if (authErr) throw authErr;

        if (authData.user) {
            // Verifica se pagou antes de criar a conta
            const { data: pendingPayments } = await supabaseClient
                .from('pagamentos_pendentes')
                .select('*')
                .eq('email', email);

            if (pendingPayments && pendingPayments.length > 0) {
                // Pagou antes! Virar PRO direto
                await supabaseClient.from('usuarios').update({
                    plan: 'PRO',
                    plan_expires_at: null,
                    status: 'Ativo',
                    phone: finalPhone
                }).eq('id', authData.user.id);

                // Remove da fila de pendentes
                await supabaseClient.from('pagamentos_pendentes').delete().eq('email', email);
            } else {
                // Fluxo normal: Set 7 days trial
                const expireDate = new Date();
                expireDate.setDate(expireDate.getDate() + 7);
                await supabaseClient.from('usuarios').update({
                    plan: 'Trial',
                    plan_expires_at: expireDate.toISOString(),
                    status: 'Ativo',
                    phone: finalPhone
                }).eq('id', authData.user.id);
            }
        }

        // 2. Verifica se o email já estava cadastrado (Supabase retorna user mas sem session)
        if (authData.user && !authData.session) {
            // Email de confirmação enviado — avisa o usuário
            errEl.textContent = "✅ Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.";
            errEl.style.color = "green";
            errEl.style.display = "block";
            document.getElementById("form-setup")?.reset();
            return;
        }

        // 3. Se não precisou confirmar e-mail, faz login direto
        const formSetup = document.getElementById("form-setup");
        if (formSetup) formSetup.reset();
        const setupPanel = document.getElementById("setup-form-panel");
        const loginPanel = document.getElementById("login-form-panel");
        if (setupPanel) setupPanel.style.display = "none";
        if (loginPanel) loginPanel.style.display = "block";

        document.getElementById("login-container").style.display = "none";
        await checkSession();
        await loadState();
        alert("Conta criada com sucesso! Bem-vinda ao ConfeitaAI, " + fullName + "! 🍰🎉");
    } catch (err) {
        console.error("Erro no cadastro:", err);
        if (err.message && err.message.includes("User already registered")) {
            return showSetupError("Este e-mail já está cadastrado. Use a tela de login.");
        }
        if (err.code === '23505' || (err.message && err.message.includes("Database error saving new user"))) {
            return showSetupError("Este nome de usuário já está em uso. Escolha outro nome (ex: " + username + "123).");
        }
        return showSetupError(err.message || "Erro ao criar conta. Tente novamente.");
    } finally {
        hideLoadingIndicator();
    }
}


function applyPermissions(role) {
    const admMenuItem = document.querySelector(".sidebar-menu a[data-tab='adm']");
    const precificacaoMenuItem = document.querySelector(".sidebar-menu a[data-tab='receitas']");

    if (admMenuItem) admMenuItem.style.display = "flex";
    if (precificacaoMenuItem) precificacaoMenuItem.style.display = "flex";

    const effectiveRole = getLoggedInUserRole();

    if (effectiveRole === "Auxiliar") {
        if (admMenuItem) admMenuItem.style.display = "none";
        if (precificacaoMenuItem) precificacaoMenuItem.style.display = "none";
    } else if (effectiveRole === "Confeiteira") {
        if (admMenuItem) admMenuItem.style.display = "none";
    }
}

// 3. UI Sync Indicators
function showLoadingIndicator() {
    let loader = document.getElementById("db-sync-indicator");
    if (!loader) {
        loader = document.createElement("div");
        loader.id = "db-sync-indicator";
        loader.style.position = "fixed";
        loader.style.bottom = "20px";
        loader.style.right = "20px";
        loader.style.backgroundColor = "var(--color-purple)";
        loader.style.color = "white";
        loader.style.padding = "10px 16px";
        loader.style.borderRadius = "30px";
        loader.style.fontSize = "12px";
        loader.style.fontWeight = "600";
        loader.style.boxShadow = "var(--shadow-medium)";
        loader.style.zIndex = "1000";
        loader.style.display = "none";
        loader.style.alignItems = "center";
        loader.style.gap = "8px";
        loader.innerHTML = `<span class="spinner">🍩</span> Sincronizando...`;
        document.body.appendChild(loader);

        const style = document.createElement("style");
        style.innerHTML = `
            #db-sync-indicator .spinner {
                animation: rotating 2s linear infinite;
                display: inline-block;
            }
            @keyframes rotating {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    loader.innerHTML = isSupabaseActive 
        ? `<span class="spinner">🍩</span> Supabase Online`
        : `💾 Modo Local (Offline)`;
    
    loader.style.backgroundColor = isSupabaseActive ? "var(--color-purple)" : "var(--color-warning)";
    loader.style.display = "none";
}

function hideLoadingIndicator() {
    // Keep visible to show status (Supabase Online or Local Mode) but remove rotating spinner
    const loader = document.getElementById("db-sync-indicator");
    if (loader) {
        loader.innerHTML = isSupabaseActive 
            ? `🟢 Supabase Conectado`
            : `💾 Armazenamento Local`;
        loader.style.backgroundColor = isSupabaseActive ? "var(--color-success)" : "var(--color-text-muted)";
        loader.style.display = "none";
    }
}

// 4. Tab Routing System
function switchTab(tabId) {
    // Enforce role-based access control (RBAC) permissions
    const session = localStorage.getItem("confeitaai_session");
    if (session) {
        try {
            const sessionData = JSON.parse(session);
            let role = null;
            if (sessionData.role === "Super Admin" && localStorage.getItem("confeitaai_impersonated_user_id")) {
                role = "Confeiteira";
            } else {
                const user = state.users.find(u => u.username === sessionData.username);
                if (user) {
                    role = user.role;
                }
            }
            if (role === "Auxiliar" && ["receitas", "adm"].includes(tabId)) {
                tabId = "dashboard";
            } else if (role === "Confeiteira" && tabId === "adm") {
                tabId = "dashboard";
            }
        } catch (e) {
            console.error("Erro ao validar permissões na aba:", e);
        }
    }

    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    const activeSection = document.getElementById(`section-${tabId}`);
    if (activeSection) activeSection.classList.add("active");

    document.querySelectorAll(".sidebar-menu a, .cacau-shortcut-btn").forEach(el => {
        el.classList.remove("active");
        if (el.getAttribute("data-tab") === tabId) {
            el.classList.add("active");
        }
    });

    const headerTitle = document.getElementById("workspace-title");
    const headerSubtitle = document.getElementById("workspace-subtitle");

    switch(tabId) {
        case "dashboard":
            if (headerTitle) headerTitle.innerText = "Painel Geral";
            if (headerSubtitle) headerSubtitle.innerText = "Acompanhe o desempenho e finanças da sua confeitaria";
            try {
                renderDashboard();
            } catch (e) {
                console.error("Erro ao renderizar Painel Geral:", e);
            }
            break;
        case "calendario":
            if (headerTitle) headerTitle.innerText = "Calendário";
            if (headerSubtitle) headerSubtitle.innerText = "Visão geral de todas as suas entregas programadas";
            try {
                renderCalendario();
            } catch (e) {
                console.error("Erro ao renderizar Calendário:", e);
            }
            break;
        case "cardapio":
            if (headerTitle) headerTitle.innerText = "Cardápio Digital";
            if (headerSubtitle) headerSubtitle.innerText = "Configure sua loja e os doces disponíveis para os clientes";
            try {
                renderCardapio();
            } catch (e) {
                console.error("Erro ao renderizar Cardápio Digital:", e);
            }
            break;
        case "encomendas":
            if (headerTitle) headerTitle.innerText = "Encomendas";
            if (headerSubtitle) headerSubtitle.innerText = "Monitore o preparo e a entrega das suas encomendas";
            try {
                renderPedidos();
            } catch (e) {
                console.error("Erro ao renderizar Encomendas:", e);
            }
            break;
        case "estoque":
            if (headerTitle) headerTitle.innerText = "Estoque Inteligente";
            if (headerSubtitle) headerSubtitle.innerText = "Mantenha o controle de matéria-prima e gere listas de compras";
            try {
                renderEstoque();
            } catch (e) {
                console.error("Erro ao renderizar Estoque Inteligente:", e);
            }
            break;
        case "clientes":
            if (headerTitle) headerTitle.innerText = "Gestão de Clientes";
            if (headerSubtitle) headerSubtitle.innerText = "Seu livro de contatos e histórico de consumo de cada cliente";
            try {
                renderClientes();
            } catch (e) {
                console.error("Erro ao renderizar Gestão de Clientes:", e);
            }
            break;
        case "fiados":
            if (headerTitle) headerTitle.innerText = "Controle de Fiados & Consignações";
            if (headerSubtitle) headerSubtitle.innerText = "Acompanhe seus produtos consignados e contas a prazo de clientes";
            try {
                renderFiados();
            } catch (e) {
                console.error("Erro ao renderizar Controle de Fiados:", e);
            }
            break;
        case "receitas":
            if (headerTitle) headerTitle.innerText = "Receitas e Precificação";
            if (headerSubtitle) headerSubtitle.innerText = "Gerencie suas fichas técnicas e calcule o custo exato com mão de obra";
            try {
                renderReceitas();
            } catch (e) {
                console.error("Erro ao renderizar Receitas:", e);
            }
            break;
        case "cacau-chat":
            if (headerTitle) headerTitle.innerText = "Conversa com a Cacau";
            if (headerSubtitle) headerSubtitle.innerText = "Seu braço direito na gestão por comandos do WhatsApp";
            try {
                renderCacauChat();
            } catch (e) {
                console.error("Erro ao renderizar Conversa com a Cacau:", e);
            }
            break;
        case "eventos":
            if (headerTitle) headerTitle.innerText = "Eventos e Prêmios";
            if (headerSubtitle) headerSubtitle.innerText = "Acompanhe e participe dos eventos da comunidade";
            try {
                const superAdminPanel = document.getElementById("eventos-superadmin-controls");
                if (superAdminPanel) {
                    const userRole = getLoggedInUserRole();
                    if (userRole === "Super Admin") {
                        superAdminPanel.style.display = "block";
                    } else {
                        superAdminPanel.style.display = "none";
                    }
                }
            } catch (e) {
                console.error("Erro ao renderizar Eventos:", e);
            }
            break;
        case "parceiros":
            if (headerTitle) headerTitle.innerText = "Marcas Parceiras";
            if (headerSubtitle) headerSubtitle.innerText = "Nossos parceiros homologados para você";
            break;
        case "grupo-whatsapp":
            if (headerTitle) headerTitle.innerText = "Networking e Apoio";
            if (headerSubtitle) headerSubtitle.innerText = "Nossa comunidade exclusiva no WhatsApp";
            break;
        case "adm":
            if (headerTitle) headerTitle.innerText = "Painel ADM";
            if (headerSubtitle) headerSubtitle.innerText = "Controle suas credenciais, dados do sistema e parâmetros de custos";
            try {
                renderAdm();
            } catch (e) {
                console.error("Erro ao renderizar Painel ADM:", e);
            }
            break;
    }
}

// 5. Initialization and Event Listeners
function safeBind(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, handler);
    } else {
        console.warn(`Aviso: Elemento com ID '${id}' não foi encontrado para vincular o evento '${event}'.`);
    }
}

function initializeConfeitaAI() {
    // Standalone Storefront Client Mode Detection
    const urlParams = new URLSearchParams(window.location.search);
    let lojaSlug = urlParams.get('loja');
    if (!lojaSlug) {
        const path = window.location.pathname;
        if (path && path !== '/' && path !== '/app' && path !== '/index.html') {
            lojaSlug = path.replace('/', '').replace('.html', '').trim();
        }
    }
    if (lojaSlug) {
        lojaSlug = decodeURIComponent(lojaSlug).trim();
        document.body.classList.add("standalone-storefront-mode");
        state.storeConfig.slug = lojaSlug;
    }

    console.log("Iniciando ConfeitaAI e vinculando elementos... 🍰");
    
    // BIND EVENT LISTENERS FIRST to prevent interface lockouts if database initialization delays
    document.querySelectorAll("[data-tab]").forEach(el => {
        el.addEventListener("click", (e) => {
            e.preventDefault();
            const tab = el.getAttribute("data-tab");
            switchTab(tab);
        });
    });

    // Bind Quick Actions buttons
    safeBind("btn-quick-order", "click", () => openModal("modal-order"));
    safeBind("btn-add-product", "click", () => {
        const form = document.getElementById("form-product");
        if (form) form.reset();
        const prodId = document.getElementById("prod-id");
        if (prodId) prodId.value = "";
        const recipeSelect = document.getElementById("prod-recipe");
        if (recipeSelect) populateRecipeSelect(recipeSelect, "");
        const modalTitle = document.getElementById("product-modal-title");
        if (modalTitle) modalTitle.innerText = "Adicionar Novo Produto";
        openModal("modal-product");
    });
    safeBind("btn-add-ingredient", "click", () => openModal("modal-ingredient"));
    safeBind("btn-generate-shopping-list", "click", () => {
        switchTab("cacau-chat");
        sendCacauCommand("Cacau, quais ingredientes estão em estoque baixo e monte uma lista de compras para mim.");
    });
    safeBind("btn-add-client", "click", () => openModal("modal-client"));
    safeBind("btn-new-order", "click", () => openModal("modal-order"));
    safeBind("btn-create-recipe", "click", () => openModal("modal-recipe"));
    safeBind("btn-create-recipe-tab", "click", () => openModal("modal-recipe"));
    safeBind("btn-add-transaction", "click", () => openModal("modal-transaction"));
    // Visit storefront in a new tab
    const openStorefrontInNewTab = () => {
        const slug = state.storeConfig.slug || "docesdaju";
        const url = `/${slug}`;
        window.open(url, "_blank");
    };
    safeBind("btn-preview-menu", "click", openStorefrontInNewTab);

    // AI Tip Action in dashboard
    safeBind("btn-tip-list-compras", "click", () => {
        switchTab("cacau-chat");
        sendCacauCommand("Cacau, quais ingredientes estão em estoque baixo?");
    });

    // Premium Themes Initialization & Selector Bind
    const savedTheme = localStorage.getItem("confeitaai_theme") || "warm-cream";
    applyTheme(savedTheme);
    const themeSelector = document.getElementById("theme-selector");
    if (themeSelector) {
        themeSelector.value = savedTheme;
        themeSelector.addEventListener("change", (e) => {
            const selectedTheme = e.target.value;
            applyTheme(selectedTheme);
            localStorage.setItem("confeitaai_theme", selectedTheme);
        });
    }

    // Export and Report Actions
    safeBind("btn-export-csv", "click", () => {
        exportTransactionsToCSV();
    });
    safeBind("btn-print-report", "click", () => {
        printFinancialReport();
    });

    // Bind Modals close actions
    document.querySelectorAll(".close-btn").forEach(el => {
        el.addEventListener("click", () => {
            closeModal(el.getAttribute("data-modal"));
        });
    });

    // Form Submissions
    safeBind("form-product", "submit", handleProductSubmit);

    // Image Upload Logic for Products
    safeBind("prod-photo-input", "change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL("image/webp", 0.8);
                document.getElementById("prod-photo-base64").value = dataUrl;
                
                const previewImg = document.getElementById("prod-photo-preview");
                if (previewImg) {
                    previewImg.src = dataUrl;
                    document.getElementById("prod-photo-preview-container").style.display = "block";
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    safeBind("btn-remove-photo", "click", () => {
        document.getElementById("prod-photo-input").value = "";
        document.getElementById("prod-photo-base64").value = "";
        document.getElementById("prod-photo-preview").src = "";
        document.getElementById("prod-photo-preview-container").style.display = "none";
    });
    
    // Auto-fill product price when a recipe is selected & toggle warning
    safeBind("prod-recipe", "change", (e) => {
        const recipeId = e.target.value;
        const warningEl = document.getElementById("recipe-warning-msg");
        if (warningEl) {
            warningEl.style.display = recipeId ? "none" : "block";
        }
        if (recipeId) {
            const recipe = state.recipes.find(r => r.id === recipeId);
            if (recipe) {
                let totalCost = 0;
                recipe.ingredients.forEach(ri => {
                    const ing = state.ingredients.find(i => i.id === ri.ingId);
                    if (ing) totalCost += ing.unit === 'un' ? ing.price * ri.amount : (ing.price / 1000) * ri.amount;
                });
                const suggestedPrice = totalCost * (1 + (recipe.margin || 200) / 100);
                
                const nameInput = document.getElementById("prod-name");
                if (nameInput && !nameInput.value) {
                    nameInput.value = recipe.name;
                }
                
                const priceInput = document.getElementById("prod-price");
                if (priceInput) {
                    priceInput.value = suggestedPrice.toFixed(2);
                }
            }
        }
    });
    safeBind("form-ingredient", "submit", handleIngredientSubmit);
    safeBind("form-client", "submit", handleClientSubmit);
    safeBind("form-order", "submit", handleOrderSubmit);
    safeBind("form-transaction", "submit", handleTransactionSubmit);
    safeBind("form-recipe", "submit", handleRecipeSubmit);
    safeBind("form-store-config", "submit", async (e) => {
        e.preventDefault();
        
        const nameVal = document.getElementById("store-name").value.trim();
        const slugVal = document.getElementById("store-slug").value.trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9-_.]/g, "");
            
        // Calculate hours based on UI selectors
        const activeDays = Array.from(document.querySelectorAll(".btn-day-toggle.active")).map(btn => btn.getAttribute("data-day"));
        const timeStart = document.getElementById("store-time-start").value;
        const timeEnd = document.getElementById("store-time-end").value;
        
        let hoursVal = "Consulte nossos horários";
        if (activeDays.length > 0 && timeStart && timeEnd) {
            let daysStr = activeDays.join(", ");
            if (activeDays.length === 5 && activeDays.includes("Seg") && activeDays.includes("Sex") && !activeDays.includes("Sáb") && !activeDays.includes("Dom")) {
                daysStr = "Seg a Sex";
            } else if (activeDays.length === 7) {
                daysStr = "Seg a Dom";
            }
            hoursVal = `${daysStr}, ${timeStart} às ${timeEnd}`;
        }

        const logoVal = document.getElementById("store-logo").value.trim();
        const bannerVal = document.getElementById("store-banner").value.trim();
        const descVal = document.getElementById("store-desc").value.trim();
        const phoneVal = document.getElementById("store-phone") ? document.getElementById("store-phone").value.trim().replace(/\D/g, '') : '';
        const themeColorVal = document.getElementById("store-theme-color") ? document.getElementById("store-theme-color").value : '#ff7eb9';
        
        if (!slugVal) {
            alert("Por favor, insira um link personalizado (slug) válido.");
            return;
        }
        
        const isOpen = document.getElementById("store-open-toggle") ? document.getElementById("store-open-toggle").checked : true;
        
        // Parse custom cake builder configurations
        const enableCakeBuilder = document.getElementById("store-enable-cake-builder") ? document.getElementById("store-enable-cake-builder").checked : false;
        const maxFillingsVal = parseInt(document.getElementById("store-cake-max-fillings")?.value) || 3;
        
        const fillingsSimples = (document.getElementById("store-cake-fillings-simples")?.value || "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);
        const fillingsFrutas = (document.getElementById("store-cake-fillings-frutas")?.value || "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);
        const fillingsGourmet = (document.getElementById("store-cake-fillings-gourmet")?.value || "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);
            
        const sizeRows = document.querySelectorAll("#builder-config-sizes-table-body tr");
        const sizesArr = [];
        sizeRows.forEach(row => {
            const sizeName = row.querySelector(".config-size-name")?.value.trim();
            const slices = row.querySelector(".config-size-slices")?.value.trim();
            const pSimples = parseFloat(row.querySelector(".config-size-simples")?.value) || 0;
            const pFrutas = parseFloat(row.querySelector(".config-size-frutas")?.value) || 0;
            const pGourmet = parseFloat(row.querySelector(".config-size-gourmet")?.value) || 0;
            const topperSimple = parseFloat(row.querySelector(".config-size-topper-simple")?.value) || 0;
            const topperCustom = parseFloat(row.querySelector(".config-size-topper-custom")?.value) || 0;
            
            if (sizeName) {
                sizesArr.push({
                    name: sizeName,
                    slices: slices || "",
                    price_simples: pSimples,
                    price_frutas: pFrutas,
                    price_gourmet: pGourmet,
                    topper_simple: topperSimple,
                    topper_custom: topperCustom
                });
            }
        });
        
        const cakeBuilderObj = {
            enabled: enableCakeBuilder,
            max_fillings: maxFillingsVal,
            fillings: {
                Simples: fillingsSimples,
                Frutas: fillingsFrutas,
                Gourmet: fillingsGourmet
            },
            sizes: sizesArr
        };

        // Otimista: Salvar localmente e atualizar UI instantaneamente
        state.storeConfig = {
            name: nameVal || "Doces da Ju",
            slug: slugVal,
            phone: phoneVal,
            hours: hoursVal,
            logo: logoVal || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop",
            banner: bannerVal || "",
            desc: descVal || "",
            cor_tema: themeColorVal,
            loja_aberta: isOpen,
            cake_builder: cakeBuilderObj
        };
        
        saveToLocalStorage();
        updateStoreShowcase();
        applyStorefrontThemeColor(state.storeConfig.cor_tema);
        updateQuickToggleUI();
        
        // Refresh storefront simulation as well to show/hide dynamic custom cake banner
        if (typeof renderStorefrontProducts === 'function') {
            renderStorefrontProducts();
        }
        
        const configPanel = document.getElementById("store-config-panel");
        if (configPanel) configPanel.style.display = "none";
        
        alert("Configurações da loja salvas com sucesso!");
        
        // Plano de fundo: Sincronizar com Supabase se ativo
        if (isSupabaseActive) {
            const loggedInUserId = getLoggedInUserId();
            if (loggedInUserId) {
                supabaseClient.from('configuracoes').upsert([{
                    id: loggedInUserId,
                    usuario_id: loggedInUserId,
                    name: state.storeConfig.name,
                    slug: state.storeConfig.slug,
                    phone: state.storeConfig.phone,
                    hours: state.storeConfig.hours,
                    logo: state.storeConfig.logo,
                    banner: state.storeConfig.banner,
                    desc: state.storeConfig.desc,
                    cor_tema: state.storeConfig.cor_tema,
                    loja_aberta: state.storeConfig.loja_aberta,
                    cake_builder: state.storeConfig.cake_builder
                }]).then(({ error }) => {
                    if (error) {
                        console.error("Erro ao salvar no Supabase:", error);
                        alert("ERRO NO BANCO DE DADOS: " + error.message + " (Detalhes: " + (error.details || error.hint || "") + ")");
                    } else {
                        console.log("Configurações salvas no Supabase com sucesso.");
                    }
                }).catch(err => {
                    console.error("Erro assíncrono ao salvar configurações:", err);
                    alert("ERRO DE CONEXÃO AO SALVAR: " + err.message);
                });
            }
        }
    });

    safeBind("form-reschedule", "submit", async (e) => {
        e.preventDefault();
        const orderId = document.getElementById("reschedule-order-id").value;
        const newDate = document.getElementById("reschedule-date").value;
        const newTime = document.getElementById("reschedule-time").value;
        
        const order = state.orders.find(o => o.id === orderId);
        if (!order) return;
        
        // 1. Update locally instantly
        order.date = newDate;
        order.time = newTime;
        saveToLocalStorage();
        closeModal("modal-reschedule");
        
        // Re-render active tab (which is currently the calendar if they are viewing this modal from there)
        renderActiveTab();
        
        // 2. Background sync
        if (isSupabaseActive) {
            try {
                await supabaseClient.from('pedidos').update({ date: newDate, time: newTime }).eq('id', orderId);
                console.log("Reagendamento de pedido sincronizado com Supabase.");
            } catch (err) {
                console.error("Erro ao sincronizar reagendamento de pedido:", err);
            }
        }
    });

    // Toggle Settings Panel Drawer
    safeBind("btn-edit-store", "click", () => {
        const configPanel = document.getElementById("store-config-panel");
        if (configPanel) {
            if (configPanel.style.display === "none") {
                configPanel.style.display = "block";
                configPanel.scrollIntoView({ behavior: "smooth" });
            } else {
                configPanel.style.display = "none";
            }
        }
    });

    safeBind("btn-close-store-config", "click", () => {
        const configPanel = document.getElementById("store-config-panel");
        if (configPanel) configPanel.style.display = "none";
    });

    safeBind("btn-cancel-store-config", "click", () => {
        const configPanel = document.getElementById("store-config-panel");
        if (configPanel) {
            configPanel.style.display = "none";
            populateStoreForm();
        }
    });
    
    // Copy link button
    safeBind("btn-copy-store-link", "click", () => {
        const slug = state.storeConfig.slug || "docesdaju";
        const origin = window.location.origin;
        const link = `${origin}/${slug}`;
        navigator.clipboard.writeText(link).then(() => {
            const btn = document.getElementById("btn-copy-store-link");
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = "✅ Copiado!";
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            }
        }).catch(err => {
            console.error("Erro ao copiar link:", err);
            alert("Não foi possível copiar o link. Por favor, copie manualmente.");
        });
    });
    
    // Visit link button (opens customer storefront in a new tab)
    safeBind("btn-visit-store-link", "click", openStorefrontInNewTab);

    // Live update showcase URL while typing slug
    safeBind("store-slug", "input", updateGeneratedStoreLink);

    // Custom cake builder configurations bindings
    safeBind("store-enable-cake-builder", "change", (e) => {
        const area = document.getElementById("cake-builder-config-area");
        if (area) area.style.display = e.target.checked ? "block" : "none";
    });
    safeBind("btn-add-builder-config-row", "click", () => {
        if (typeof window.addBuilderConfigRow === 'function') {
            window.addBuilderConfigRow();
        }
    });

    // Phone drawer UI buttons
    safeBind("btn-close-phone-cart", "click", closePhoneCartDrawer);
    safeBind("phone-cart-backdrop", "click", closePhoneCartDrawer);
    
    // Toggle buttons inside phone (Retirada vs Entrega)
    const btnPickup = document.getElementById("btn-toggle-delivery-pickup");
    const btnDelivery = document.getElementById("btn-toggle-delivery-home");
    const addrGroup = document.getElementById("phone-delivery-address-group");
    const addrInput = document.getElementById("phone-cust-address");
    
    if (btnPickup && btnDelivery) {
        btnPickup.addEventListener("click", () => {
            btnPickup.classList.add("active");
            btnDelivery.classList.remove("active");
            if (addrGroup) addrGroup.style.display = "none";
            if (addrInput) addrInput.required = false;
        });
        
        btnDelivery.addEventListener("click", () => {
            btnDelivery.classList.add("active");
            btnPickup.classList.remove("active");
            if (addrGroup) addrGroup.style.display = "block";
            if (addrInput) addrInput.required = true;
        });
    }

    // Submit order button
    safeBind("btn-phone-submit-order", "click", processarEncomendaDigital);

    // Receipt Scanner Bindings
    safeBind("btn-scan-receipt", "click", () => openModal("modal-receipt-scanner"));
    const uploadArea = document.getElementById("receipt-upload-area");
    const fileInput = document.getElementById("receipt-file-input");
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                processReceiptOCR(e.target.files[0]);
            }
        });
    }

    // WhatsApp elements inside Chat view
    safeBind("wa-send-btn", "click", handleWaSend);
    const waInput = document.getElementById("wa-message-input");
    if (waInput) {
        waInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleWaSend();
        });
    }

    // Voice Recognition for Cacau
    const waMicBtn = document.getElementById("wa-mic-btn");
    if (waMicBtn) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'pt-BR';

            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = function() {
                waMicBtn.style.color = '#ef4444'; 
                waMicBtn.style.transform = 'scale(1.2)';
            };

            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                if (waInput) {
                    waInput.value = transcript;
                    handleWaSend();
                }
            };

            recognition.onend = function() {
                waMicBtn.style.color = '#64748b';
                waMicBtn.style.transform = 'scale(1)';
            };

            waMicBtn.addEventListener('click', () => {
                try {
                    recognition.start();
                } catch (e) {
                    console.error(e);
                }
            });
        } else {
            waMicBtn.addEventListener('click', () => {
                alert("Seu navegador não suporta reconhecimento de voz.");
            });
        }
    }

    // Eventos Super Admin Form Handler
    const formCriarEvento = document.getElementById("form-criar-evento");
    if (formCriarEvento) {
        formCriarEvento.addEventListener("submit", (e) => {
            e.preventDefault();
            const tema = document.getElementById("evento-tema").value;
            const premio = document.getElementById("evento-premio").value;
            if(confirm(`Tem certeza que deseja disparar o evento "${tema}" com prêmio de R$ ${premio} para todas as assinantes PRO?`)) {
                alert("🚀 Evento disparado com sucesso via WhatsApp para todas as confeiteiras PRO!");
                formCriarEvento.reset();
            }
        });
    }

    // Quick Prompts Suggestions inside Cacau view
    document.querySelectorAll(".btn-suggestion").forEach(btn => {
        btn.addEventListener("click", () => {
            const prompt = btn.getAttribute("data-prompt");
            sendCacauCommand(prompt);
        });
    });

    // Search bar dynamic filters
    safeBind("search-product", "input", (e) => renderCardapio(e.target.value));
    safeBind("search-ingredient", "input", (e) => renderEstoque(e.target.value));
    safeBind("search-client", "input", (e) => renderClientes(e.target.value));
    safeBind("filter-clientes", "change", () => renderClientes(document.getElementById("search-client").value));
    safeBind("search-recipe", "input", (e) => renderReceitas(e.target.value));

    // Fiados events
    safeBind("search-fiados", "input", () => renderFiados());
    safeBind("filter-fiado-status", "change", () => renderFiados());
    safeBind("filter-fiado-type", "change", () => renderFiados());
    safeBind("form-fiado", "submit", handleFiadoSubmit);
    
    // Add product to fiado description helper
    safeBind("btn-fiado-add-product", "click", () => {
        const prodSelect = document.getElementById("fiado-product-select");
        const qtyInput = document.getElementById("fiado-product-qty");
        const descTextarea = document.getElementById("fiado-desc");
        const totalValInput = document.getElementById("fiado-total-val");

        const prodId = prodSelect.value;
        const qty = parseInt(qtyInput.value) || 1;

        if (prodId) {
            const product = state.products.find(p => p.id === prodId);
            if (product) {
                const line = `${qty}x ${product.name}`;
                const currentVal = descTextarea.value.trim();
                descTextarea.value = currentVal ? `${currentVal}, ${line}` : line;

                const existingTotal = parseFloat(totalValInput.value) || 0;
                totalValInput.value = (existingTotal + (product.price * qty)).toFixed(2);
                
                prodSelect.value = "";
                qtyInput.value = "1";
            }
        }
    });

    // Populate client text when selecting from dropdown
    safeBind("fiado-client-select", "change", (e) => {
        const select = e.target;
        const nameInput = document.getElementById("fiado-client-name");
        if (select.value) {
            nameInput.value = select.options[select.selectedIndex].text.replace(/\s\([^)]+\)/g, '');
        }
    });

    // Recipe Row dynamic calculations
    safeBind("btn-recipe-add-row", "click", () => addRecipeIngredientRow());
    safeBind("rec-margin", "input", calculateRecipeCostsInRealTime);
    safeBind("rec-prep-time", "input", calculateRecipeCostsInRealTime);
    safeBind("rec-labor-rate", "input", calculateRecipeCostsInRealTime);
    safeBind("rec-gas-cost", "input", calculateRecipeCostsInRealTime);
    safeBind("rec-packaging-cost", "input", calculateRecipeCostsInRealTime);
    safeBind("rec-fixed-overhead", "input", calculateRecipeCostsInRealTime);
    safeBind("rec-yield", "input", calculateRecipeCostsInRealTime);

    // Dashboard Navigation (Period Dropdown)
    safeBind("dash-period-type", "change", (e) => {
        dashPeriodType = e.target.value;
        const btnPrev = document.getElementById("btn-prev-month-dash");
        const btnNext = document.getElementById("btn-next-month-dash");
        
        if (dashPeriodType === 'month' || dashPeriodType === 'day') {
            if (btnPrev) btnPrev.style.display = 'flex';
            if (btnNext) btnNext.style.display = 'flex';
        } else {
            if (btnPrev) btnPrev.style.display = 'none';
            if (btnNext) btnNext.style.display = 'none';
        }
        
        dashSelectedMonth = new Date().getMonth();
        dashSelectedYear = new Date().getFullYear();
        dashSelectedDate = new Date();
        renderDashboard();
    });

    // Dashboard Month Navigation Buttons
    safeBind("btn-prev-month-dash", "click", () => {
        if (dashPeriodType === 'month') {
            dashSelectedMonth--;
            if (dashSelectedMonth < 0) {
                dashSelectedMonth = 11;
                dashSelectedYear--;
            }
        } else if (dashPeriodType === 'day') {
            dashSelectedDate.setDate(dashSelectedDate.getDate() - 1);
        }
        renderDashboard();
    });
    safeBind("btn-next-month-dash", "click", () => {
        if (dashPeriodType === 'month') {
            dashSelectedMonth++;
            if (dashSelectedMonth > 11) {
                dashSelectedMonth = 0;
                dashSelectedYear++;
            }
        } else if (dashPeriodType === 'day') {
            dashSelectedDate.setDate(dashSelectedDate.getDate() + 1);
        }
        renderDashboard();
    });
    safeBind("btn-dash-current-month", "click", () => {
        const today = new Date();
        dashSelectedMonth = today.getMonth();
        dashSelectedYear = today.getFullYear();
        renderDashboard();
    });

    // Admin Panel Actions
    safeBind("form-adm-supabase", "submit", handleAdmSupabaseSubmit);
    safeBind("form-adm-pricing", "submit", handleAdmPricingSubmit);
    safeBind("btn-mode-online", "click", () => handleModeChange(false));
    safeBind("btn-mode-offline", "click", () => handleModeChange(true));
    safeBind("btn-adm-seed", "click", handleSeedDatabaseClick);
    safeBind("btn-adm-wipe", "click", handleWipeDatabaseClick);

    // Collaborator Management & Authentication Actions
    safeBind("form-login", "submit", handleLoginSubmit);
    safeBind("btn-logout", "click", async () => { await handleLogout(); });
    safeBind("btn-add-user", "click", () => {
        const form = document.getElementById("form-user");
        if (form) form.reset();
        const userId = document.getElementById("user-id");
        if (userId) userId.value = "";
        const modalTitle = document.getElementById("user-modal-title");
        if (modalTitle) modalTitle.innerText = "Cadastrar Novo Colaborador";
        openModal("modal-user");
    });
    safeBind("form-user", "submit", handleUserSubmit);

    // Setup Panel (Primeiro Acesso) toggles
    safeBind("btn-show-setup", "click", () => {
        document.getElementById("login-form-panel").style.display = "none";
        document.getElementById("setup-form-panel").style.display = "block";
        const f = document.getElementById("form-setup");
        if (f) f.reset();
        const err = document.getElementById("setup-error-msg");
        if (err) err.style.display = "none";
    });
    safeBind("btn-back-to-login", "click", () => {
        document.getElementById("setup-form-panel").style.display = "none";
        document.getElementById("login-form-panel").style.display = "block";
    });
    safeBind("form-setup", "submit", handleSetupSubmit);
    safeBind("btn-toggle-tech-configs", "click", () => {
        const techArea = document.getElementById("tech-configs-area");
        const btn = document.getElementById("btn-toggle-tech-configs");
        if (techArea) {
            if (techArea.style.display === "none") {
                techArea.style.display = "grid";
                if (btn) btn.innerText = "⚙️ Ocultar Configurações do Sistema e Banco de Dados";
            } else {
                techArea.style.display = "none";
                if (btn) btn.innerText = "⚙️ Exibir Configurações do Sistema e Banco de Dados";
            }
        }
    });

    // Run async load state after bindings
    initSupabaseClient().then(() => {
        loadState();
        window.confeitaAiLoaded = true;
    });
}

// Direct initialization as the script is at the bottom of the body
initializeConfeitaAI();


// Modal Utilities
function openModal(modalId) {
    document.getElementById(modalId).classList.add("active");
    if (modalId === "modal-recipe") {
        const listDiv = document.getElementById("recipe-ingredients-list-inputs");
        listDiv.innerHTML = "";
        addRecipeIngredientRow();
        addRecipeIngredientRow();
        
        // Prefill default parameters
        const marginInput = document.getElementById("rec-margin");
        if (marginInput) marginInput.value = DEFAULT_MARKUP;
        
        const prepTimeInput = document.getElementById("rec-prep-time");
        if (prepTimeInput) prepTimeInput.value = "1.0";

        const laborRateInput = document.getElementById("rec-labor-rate");
        if (laborRateInput) laborRateInput.value = DEFAULT_HOURLY_RATE.toFixed(2);

        const gasCostInput = document.getElementById("rec-gas-cost");
        if (gasCostInput) gasCostInput.value = "2.00";
        
        const packagingInput = document.getElementById("rec-packaging-cost");
        if (packagingInput) packagingInput.value = DEFAULT_PACKAGING.toFixed(2);

        const fixedOverheadInput = document.getElementById("rec-fixed-overhead");
        if (fixedOverheadInput) fixedOverheadInput.value = "1.00";
        
        calculateRecipeCostsInRealTime();
    }
    if (modalId === "modal-fiado") {
        document.getElementById("form-fiado").reset();
        document.getElementById("fiado-id").value = "";
        document.getElementById("modal-fiado-title").innerText = "Registrar Novo Fiado / Consignação";
        
        // Prefill date
        const dateInput = document.getElementById("fiado-date");
        if (dateInput) {
            dateInput.value = new Date().toISOString().substring(0, 10);
        }

        // Populate clients select
        const clientSelect = document.getElementById("fiado-client-select");
        if (clientSelect) {
            clientSelect.innerHTML = '<option value="">-- Selecione ou digite abaixo --</option>';
            state.clients.forEach(c => {
                clientSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }

        // Populate products select
        const prodSelect = document.getElementById("fiado-product-select");
        if (prodSelect) {
            prodSelect.innerHTML = '<option value="">Selecione um produto do cardápio...</option>';
            state.products.forEach(p => {
                prodSelect.innerHTML += `<option value="${p.id}">${p.emoji || '🧁'} ${p.name} (R$ ${p.price.toFixed(2)})</option>`;
            });
        }
    }
    populateSelectDropdowns();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");
}

function populateSelectDropdowns() {
    const clientSelect = document.getElementById("ord-client");
    clientSelect.innerHTML = '<option value="">Selecione um cliente...</option>';
    state.clients.forEach(c => {
        clientSelect.innerHTML += `<option value="${c.id}">${c.name} (${c.phone})</option>`;
    });

    const productSelect = document.getElementById("ord-product");
    productSelect.innerHTML = '<option value="">Selecione um produto...</option>';
    state.products.forEach(p => {
        productSelect.innerHTML += `<option value="${p.id}">${p.emoji} ${p.name} - R$ ${p.price.toFixed(2)}</option>`;
    });

    productSelect.addEventListener("change", (e) => {
        const prod = state.products.find(p => p.id === e.target.value);
        if (prod) {
            const qty = parseInt(document.getElementById("ord-qty").value) || 1;
            document.getElementById("ord-price").value = (prod.price * qty).toFixed(2);
        }
    });

    document.getElementById("ord-qty").addEventListener("input", (e) => {
        const prodId = document.getElementById("ord-product").value;
        const prod = state.products.find(p => p.id === prodId);
        if (prod) {
            const qty = parseInt(e.target.value) || 1;
            document.getElementById("ord-price").value = (prod.price * qty).toFixed(2);
        }
    });
}


// ================= 6. RENDER FUNCTIONS =================

// A. DASHBOARD VIEW
function renderDashboard() {
    if (!state) return;
    const now = new Date();
    
    const dashFilter = window.globalDashFilter || 'today';
    const dashCustomMonth = window.globalDashCustomMonth || '';
    
    // Set label in all placeholders for compatibility
    const labelTitle = dashFilter === 'today' ? 'Hoje' :
                       dashFilter === '7days' ? 'Últimos 7 Dias' :
                       dashFilter === '30days' ? 'Últimos 30 Dias' :
                       dashFilter === 'custom' ? dashCustomMonth : 'Tempo Todo';

    ["dash-month-label","dash-month-label-2","dash-cashflow-month","dash-chart-month"].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerText = labelTitle;
    });

    // Helper: check if date string belongs to the selected period
    function isDateInSelectedPeriod(dateStr) {
        if (!dateStr) return false;
        if (dashFilter === 'all') return true;
        
        const d = new Date(dateStr + "T00:00:00");
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (dashFilter === 'today') {
            return d.getTime() === today.getTime();
        } else if (dashFilter === '7days') {
            const past = new Date(today);
            past.setDate(past.getDate() - 7);
            return d >= past && d <= today;
        } else if (dashFilter === '30days') {
            const past = new Date(today);
            past.setDate(past.getDate() - 30);
            return d >= past && d <= today;
        } else if (dashFilter === 'custom') {
            if (!dashCustomMonth) return true;
            const [y, m] = dashCustomMonth.split('-');
            return d.getFullYear() === parseInt(y) && (d.getMonth() + 1) === parseInt(m);
        }
        return true;
    }

    // Financial metrics filtered to navigated month
    const monthTrans = state.transactions.filter(t => isDateInSelectedPeriod(t.date));
    const income  = monthTrans.filter(t => t.type === "Entrada").reduce((s,t) => s + t.val, 0);
    const expense = monthTrans.filter(t => t.type !== "Entrada").reduce((s,t) => s + t.val, 0);
    const profit  = income - expense;
    const fmt = v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    setEl("dash-month-income",  fmt(income));
    setEl("dash-month-expense", fmt(expense));
    setEl("dash-month-profit",  fmt(profit));
    setEl("dash-income-count",  `${monthTrans.filter(t => t.type === "Entrada").length} entradas`);
    setEl("dash-expense-count", `${monthTrans.filter(t => t.type !== "Entrada").length} saídas`);

    const profitEl = document.getElementById("dash-month-profit");
    if (profitEl) profitEl.className = "metric-value " + (profit >= 0 ? "text-success" : "text-danger");

    // Orders filtered to navigated month
    const monthOrders = state.orders.filter(o => isDateInSelectedPeriod(o.date));
    const pendingCount = monthOrders.filter(o => o.status !== "Entregue").length;
    setEl("dash-orders-count",   String(monthOrders.length));
    setEl("dash-orders-pending", `${pendingCount} pendentes`);

    // Active orders list
    const urgentDiv = document.getElementById("dash-urgent-orders");
    if (urgentDiv) {
        urgentDiv.innerHTML = "";
        const activeOrders = monthOrders
            .filter(o => o.status !== "Entregue")
            .sort((a,b) => new Date(a.date) - new Date(b.date));

        if (activeOrders.length === 0) {
            urgentDiv.innerHTML = `<div class="empty-state"><p>Nenhuma encomenda ativa neste período!</p></div>`;
        } else {
            activeOrders.forEach(o => {
                const client  = state.clients.find(c => c.id === o.clientId);
                const product = state.products.find(p => p.id === o.productId);
                const rawDate = new Date(o.date + "T00:00:00");
                const fmtDate = rawDate.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" });
                const isToday = now.toDateString() === rawDate.toDateString();
                let badgeClass = "badge";
                if (o.status === "Recebido") badgeClass = "badge";
                else if (o.status === "Em Produção" || o.status === "Em Producao") badgeClass = "badge badge-warning";
                else if (o.status === "Pronto")  badgeClass = "badge badge-success";

                let typeLabel = "";
                if (o.notes) {
                    if (o.notes.includes("Entrega") || o.notes.includes("Delivery")) {
                        typeLabel = `<span style="color: #1e40af; font-weight: 700; font-size: 10px; padding: 2px 6px; background: #eff6ff; border-radius: 4px; margin-left: 6px;">🛵 Delivery</span>`;
                    } else if (o.notes.includes("Retirada")) {
                        typeLabel = `<span style="color: #854d0e; font-weight: 700; font-size: 10px; padding: 2px 6px; background: #fffbeb; border-radius: 4px; margin-left: 6px;">🛍️ Retirada</span>`;
                    }
                }

                urgentDiv.innerHTML += `
                    <div class="compact-order-item">
                        <div class="compact-order-info">
                            <span class="compact-order-title">${o.qty}x ${product ? product.name : "Doce Especial"}</span>
                            <span class="compact-order-client" style="display: flex; align-items: center; flex-wrap: wrap;">Cliente: ${client ? client.name : "Convidado"} (${o.time})${typeLabel}</span>
                        </div>
                        <div class="action-flex">
                            <span class="${isToday ? 'compact-order-date' : 'badge badge-warning'}">${isToday ? 'Hoje' : fmtDate}</span>
                            <span class="${badgeClass}" style="margin-left:8px;">${o.status}</span>
                        </div>
                    </div>`;
            });
        }
    }

    // Transactions table filtered to navigated month
    const transList = document.getElementById("transactions-list");
    if (transList) {
        transList.innerHTML = "";
        const sorted = [...monthTrans].sort((a,b) => new Date(b.date) - new Date(a.date));
        if (sorted.length === 0) {
            transList.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px 0;color:var(--color-text-muted);">Nenhum lançamento neste período.</td></tr>`;
        } else {
            sorted.forEach(t => {
                const fmtD = new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR", {day:"2-digit",month:"2-digit",year:"numeric"});
                const isIn = t.type === "Entrada";
                transList.innerHTML += `
                    <tr>
                        <td>${fmtD}</td>
                        <td>${t.desc}</td>
                        <td><span class="badge ${isIn ? 'badge-success' : 'badge-danger'}">${t.type}</span></td>
                        <td>${t.category}</td>
                        <td style="font-weight:600;color:${isIn ? 'var(--color-success)' : 'var(--color-danger)'};">${isIn ? '+' : '-'} ${fmt(t.val)}</td>
                        <td style="text-align:right;">
                            <button class="btn btn-sm btn-outline" style="color:var(--color-danger); border:none; padding:4px;" onclick="deleteTransaction('${t.id}')">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </td>
                    </tr>`;
            });
        }
    }

    // Update Line Chart (Chart.js)
    if (typeof renderDashboardLineChart === 'function') {
        renderDashboardLineChart(monthTrans);
    }

    // Stock Alerts
    const lowStockItems = state.ingredients.filter(i => i.qty <= i.min);
    const alertDiv = document.getElementById("dashboard-stock-alert");
    const alertText = document.getElementById("dashboard-stock-alert-text");
    if (alertDiv && alertText) {
        if (lowStockItems.length > 0) {
            alertDiv.style.display = "flex";
            if (lowStockItems.length === 1) {
                alertText.innerText = `O ingrediente "${lowStockItems[0].name}" está com estoque baixo.`;
            } else {
                alertText.innerText = `Você tem ${lowStockItems.length} ingredientes com estoque baixo.`;
            }
        } else {
            alertDiv.style.display = "none";
        }
    }

    // CRM Insights: 1 year anniversary
    const crmDiv = document.getElementById("dashboard-crm-alert");
    const crmText = document.getElementById("dashboard-crm-text");
    const crmBtn = document.getElementById("dashboard-crm-btn");
    
    if (crmDiv && crmText && crmBtn) {
        let anniversaryClients = [];
        state.clients.forEach(c => {
            const clientOrders = state.orders.filter(o => o.clientId === c.id).sort((a,b) => new Date(a.date) - new Date(b.date));
            if (clientOrders.length > 0) {
                const firstOrderDate = new Date(clientOrders[0].date + "T00:00:00");
                const diffDays = Math.floor((new Date() - firstOrderDate) / (1000 * 60 * 60 * 24));
                // Consider anniversary if between 330 and 365 days ago
                if (diffDays >= 330 && diffDays <= 365) {
                    anniversaryClients.push(c);
                }
            }
        });

        if (anniversaryClients.length > 0) {
            crmDiv.style.display = "flex";
            const firstClient = anniversaryClients[0];
            crmText.innerText = `A cliente ${firstClient.name} fez o 1º pedido há quase 1 ano. Envie um mimo!`;
            
            const message = encodeURIComponent(`Olá ${firstClient.name}! Aqui é da ConfeitaAI. Percebemos que faz quase 1 ano do seu primeiro pedido com a gente! 🎉 Como agradecimento, gostaríamos de te dar um cupom de 10% OFF no seu próximo pedido. Vamos celebrar? 🍰`);
            crmBtn.href = `https://wa.me/55${firstClient.phone}?text=${message}`;
        } else {
            crmDiv.style.display = "none";
        }
    }
}

// B. CARDAPIO VIEW
function renderCardapio(searchQuery = "") {
    if (!state) return;
    const list = document.getElementById("products-list");
    list.innerHTML = "";

    const filtered = state.products.filter(p => {
        // Enforce strict business rule: product MUST have a valid associated recipe OR be independent (no recipeId)
        const hasValidRecipe = !p.recipeId || state.recipes.some(r => r.id === p.recipeId);
        if (!hasValidRecipe) return false;
        
        return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               p.category.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <p>Nenhum produto cadastrado com essa pesquisa. 🍰</p>
            </div>
        `;
        return;
    }

    filtered.forEach(p => {
        const promoBadge = p.destacado ? `<span class="badge product-badge" style="position:relative; z-index:1; background:#eab308; color:white; border:none; margin-left:4px;">⭐ Destaque</span>` : "";
        const recipeWarning = !p.recipeId ? `
            <div class="recipe-nudge" onclick="editProduct('${p.id}', true)" title="Clique para vincular uma receita e ativar a baixa de estoque automática" style="display: inline-flex; align-items: center; gap: 4px; background: #fff7ed; border: 1px solid #ffedd5; color: #c2410c; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-top: 6px; font-weight: 500; cursor: pointer; width: fit-content; transition: background 0.2s;">
                <span>⚠️</span> Sem estoque automático
            </div>
        ` : "";
        list.innerHTML += `
            <div class="product-card">
                <div class="product-emoji-banner" style="position: relative; overflow: hidden; ${p.photo ? 'padding:0;' : ''}">
                    ${p.photo ? `<img src="${p.photo}" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:0;">` : p.emoji}
                    <div style="display:flex; flex-wrap:wrap; gap:4px; position:absolute; top:8px; left:8px; z-index:1;">
                        <span class="badge badge-purple product-badge" style="position:static;">${p.category}</span>
                        ${promoBadge}
                    </div>
                </div>
                <div class="product-info" style="display: flex; flex-direction: column;">
                    <h3 class="product-title">${p.name}</h3>
                    <p class="product-desc" style="flex-grow: 1; margin-bottom: 8px;">${p.desc || p.description || "Sem descrição cadastrada."}</p>
                    ${recipeWarning}
                    <div class="product-footer" style="margin-top: 10px;">
                        <span class="product-price">R$ ${p.price.toFixed(2)}</span>
                        <div class="card-actions">
                            <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')">Editar</button>
                            <button class="btn btn-outline btn-sm" style="color: var(--color-danger);" onclick="deleteProduct('${p.id}')">Excluir</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// C. PEDIDOS VIEW
function renderPedidos() {
    if (!state) return;
    const cols = {
        "Recebido": document.getElementById("cards-recebido"),
        "Em Produção": document.getElementById("cards-producao"),
        "Pronto": document.getElementById("cards-pronto"),
        "Entregue": document.getElementById("cards-entregue")
    };

    Object.values(cols).forEach(el => el.innerHTML = "");
    const counts = { "Recebido": 0, "Em Produção": 0, "Pronto": 0, "Entregue": 0 };

    state.orders.forEach(o => {
        counts[o.status]++;
        const client = state.clients.find(c => c.id === o.clientId);
        const product = state.products.find(p => p.id === o.productId);
        
        const rawDate = new Date(o.date + "T00:00:00");
        const formattedDate = rawDate.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
        
        const isUrgent = (o.status !== "Entregue" && new Date(o.date) <= new Date(new Date().setDate(new Date().getDate() + 1)));
        const urgentClass = isUrgent ? "urgent" : "";

        const tagHtml = o.tag ? `<span class="badge badge-tag-${o.tag.toLowerCase()}" style="margin-top: 4px; display: inline-block;">${o.tag}</span>` : "";

        let typeBadge = "";
        if (o.notes) {
            if (o.notes.includes("Entrega") || o.notes.includes("Delivery")) {
                typeBadge = `<span class="badge" style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-size: 10px; font-weight: 700; margin-top: 4px; display: inline-block;">🛵 Delivery</span>`;
            } else if (o.notes.includes("Retirada")) {
                typeBadge = `<span class="badge" style="background: #fffbeb; color: #854d0e; border: 1px solid #fef08a; font-size: 10px; font-weight: 700; margin-top: 4px; display: inline-block;">🛍️ Retirada</span>`;
            }
        }

        let displayTitle = product ? `${product.emoji || "🧁"} ${o.qty}x ${product.name}` : `🧁 ${o.qty}x Doce Especial`;
        if (o.notes && o.notes.includes("Bolo Personalizado:")) {
            const lines = o.notes.split('\n');
            const customTitleLine = lines.find(l => l.includes("Bolo Personalizado:"));
            if (customTitleLine) {
                displayTitle = `🍰 ${o.qty}x ${customTitleLine.replace("Bolo Personalizado:", "").trim()}`;
            }
        }
        let displayNotes = o.notes || "";
        displayNotes = displayNotes.replace(/\[CART:\d+\]\s*/g, ""); // Clean up cart tracking code from view

        const cardHtml = `
            <div class="kanban-card ${urgentClass}" data-order-id="${o.id}">
                <div class="kanban-card-title">${displayTitle}</div>
                <div class="kanban-card-client">Cliente: <strong>${client ? client.name : "Sem Nome"}</strong></div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px;">
                    ${tagHtml}
                    ${typeBadge}
                </div>
                <p style="font-size: 11px; color: var(--color-text-muted); line-height:1.3; margin-top: 4px;">${displayNotes}</p>
                <div class="kanban-card-details">
                    <span class="kanban-card-date">${formattedDate} às ${o.time}</span>
                    <span class="kanban-card-val">R$ ${o.val.toFixed(2)}</span>
                </div>
                <div class="kanban-card-actions" style="display: flex; gap: 5px; flex-wrap: wrap;">
                    ${o.status !== "Recebido" ? `<button class="btn btn-outline btn-sm" title="Voltar fase" onclick="moveOrderStatus('${o.id}', 'prev')">←</button>` : ''}
                    
                    ${o.status === "Em Produção" ? `<button class="btn btn-sm" style="flex: 1; padding: 2px 5px; background: #25D366; color: white; border: none; font-weight: bold;" onclick="openWhatsAppForOrder('${o.id}')">💬 Avisar Produção</button>` : ''}
                    
                    ${o.status === "Pronto" ? `<button class="btn btn-success btn-sm" style="flex: 1; padding: 2px 5px; font-weight: bold;" onclick="openWhatsAppForOrder('${o.id}')">🟢 Avisar Retirada</button>` : ''}
                    
                    ${o.status === "Entregue" ? `<button class="btn btn-outline btn-sm" title="Baixar Recibo PDF" style="flex: 1; padding: 2px 5px; color: #e11d48; border-color: #fca5a5;" onclick="gerarReciboPDF('${o.id}')">📄 PDF</button>` : ''}
                    <button class="btn btn-outline btn-sm" title="Imprimir Via de Produção" onclick="imprimirCupomPedido('${o.id}')">🖨️</button>
                    <button class="btn btn-outline btn-sm" title="Excluir" style="color:var(--color-danger)" onclick="deleteOrder('${o.id}')">X</button>
                    ${o.status !== "Entregue" ? `<button class="btn btn-outline btn-sm" title="Avançar fase" onclick="moveOrderStatus('${o.id}', 'next')">→</button>` : ''}
                </div>
            </div>
        `;

        if (cols[o.status]) {
            cols[o.status].innerHTML += cardHtml;
        }
    });

    document.getElementById("badge-recebido").innerText = counts["Recebido"];
    document.getElementById("badge-producao").innerText = counts["Em Produção"];
    document.getElementById("badge-pronto").innerText = counts["Pronto"];
    document.getElementById("badge-entregue").innerText = counts["Entregue"];

    // Initialize SortableJS
    if (window.Sortable) {
        Object.values(cols).forEach(container => {
            new Sortable(container, {
                group: 'kanban',
                animation: 150,
                delay: 100, // delay on touch to allow scrolling
                delayOnTouchOnly: true,
                onEnd: function (evt) {
                    const itemEl = evt.item;
                    const toContainer = evt.to;
                    const orderId = itemEl.getAttribute("data-order-id");
                    const newStatus = toContainer.getAttribute("data-status");
                    
                    if (orderId && newStatus) {
                        updateOrderStatus(orderId, newStatus);
                    }
                }
            });
        });
    }
}

// D. ESTOQUE VIEW
function renderEstoque(searchQuery = "") {
    if (!state) return;
    const list = document.getElementById("stock-list");
    list.innerHTML = "";

    const filtered = state.ingredients.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filtered.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="text-align: center; padding: 30px 0; color: var(--color-text-muted);">
                    Nenhum ingrediente cadastrado. 🧁
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(i => {
        const isLow = i.qty <= i.min;
        const statusBadge = isLow 
            ? '<span class="badge badge-danger">Baixo Estoque</span>'
            : '<span class="badge badge-success">Adequado</span>';

        list.innerHTML += `
            <tr>
                <td><strong>${i.name}</strong></td>
                <td>${i.qty.toLocaleString('pt-BR')}</td>
                <td><span class="badge">${i.unit}</span></td>
                <td>${statusBadge}</td>
                <td>R$ ${i.price.toFixed(2)}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="quickAddStock('${i.id}')">+ Adicionar Qtd</button>
                    <button class="btn btn-outline btn-sm" style="color: var(--color-danger);" onclick="deleteIngredient('${i.id}')">Excluir</button>
                </td>
            </tr>
        `;
    });
}

// E. CLIENTES VIEW
function renderClientes(searchQuery = "") {
    if (!state) return;
    const list = document.getElementById("clients-list");
    if (!list) return;
    list.innerHTML = "";

    const filterSelect = document.getElementById("filter-clientes");
    const sortBy = filterSelect ? filterSelect.value : "alpha";

    let filtered = state.clients.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.phone.includes(searchQuery)
    );

    // Pre-calculate data for rendering and sorting
    filtered = filtered.map(c => {
        const clientOrders = state.orders.filter(o => o.clientId === c.id || o.client_id === c.id).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        let lastOrderDate = null;
        let diffDays = -1;
        let deliveryMode = null;
        
        if (clientOrders.length > 0) {
            lastOrderDate = new Date(clientOrders[0].date + "T00:00:00");
            diffDays = Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24));
            
            const notes = clientOrders[0].notes || "";
            if (notes.includes("Endereço de Entrega") || notes.includes("Modalidade: Entrega")) {
                deliveryMode = "Delivery";
            } else if (notes.includes("Retirada")) {
                deliveryMode = "Retirada";
            }
        }
        
        return {
            ...c,
            clientOrders,
            lastOrderDate,
            diffDays,
            deliveryMode
        };
    });

    // Apply Sorting
    filtered.sort((a, b) => {
        if (sortBy === "alpha") {
            return a.name.localeCompare(b.name);
        } else if (sortBy === "ticket") {
            return b.totalSpent - a.totalSpent;
        } else if (sortBy === "recent") {
            if (!a.lastOrderDate) return 1;
            if (!b.lastOrderDate) return -1;
            return b.lastOrderDate - a.lastOrderDate;
        } else if (sortBy === "oldest") {
            if (!a.lastOrderDate) return 1;
            if (!b.lastOrderDate) return -1;
            return a.lastOrderDate - b.lastOrderDate;
        }
        return 0;
    });

    if (filtered.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="text-align: center; padding: 30px 0; color: var(--color-text-muted);">
                    Nenhum cliente encontrado. 👥
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(c => {
        let tagsHtml = "";
        
        // VIP Tag
        if (c.clientOrders.length >= 3 || c.orderCount >= 3) {
            tagsHtml += `<span class="badge" style="background: linear-gradient(45deg, #FFD700, #FDB931); color: #855a00; border: none; font-weight: bold; margin-right: 5px;">🥇 VIP</span>`;
        }
        
        // Ausente Tag
        if (c.diffDays > 60) {
            tagsHtml += `<span class="badge badge-danger" style="margin-right: 5px;" title="Último pedido há ${c.diffDays} dias">⚠️ Ausente</span>`;
        }
        
        // Delivery / Retirada Tag
        if (c.deliveryMode === "Delivery") {
            tagsHtml += `<span class="badge" style="background: #e0e7ff; color: #4338ca; border: none; font-weight: bold; margin-right: 5px;">🛵 Delivery</span>`;
        } else if (c.deliveryMode === "Retirada") {
            tagsHtml += `<span class="badge" style="background: #fce7f3; color: #be185d; border: none; font-weight: bold; margin-right: 5px;">📍 Retirada</span>`;
        }

        const lastOrderStr = c.lastOrderDate ? c.lastOrderDate.toLocaleDateString('pt-BR') : 'Sem pedidos';

        list.innerHTML += `
            <tr>
                <td><strong>${c.name}</strong><br><div style="margin-top: 4px;">${tagsHtml}</div></td>
                <td><a href="https://wa.me/55${c.phone}" target="_blank" class="btn-text" style="text-decoration:none;">🟢 WhatsApp (${c.phone})</a></td>
                <td><span class="badge">${c.clientOrders.length > 0 ? c.clientOrders.length : c.orderCount} pedidos</span></td>
                <td><span style="color: var(--color-text-muted); font-size: 13px;">${lastOrderStr}</span></td>
                <td><strong>R$ ${c.totalSpent.toFixed(2)}</strong></td>
                <td>
                    <button class="btn btn-purple btn-sm" onclick="openClientHistoryModal('${c.id}')" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;">📋 Histórico</button>
                    <button class="btn btn-outline btn-sm" onclick="deleteClient('${c.id}')" style="color:var(--color-danger)">Excluir</button>
                </td>
            </tr>
        `;
    });
}

// F. RECEITAS VIEW
// Helper: calcular quantas unidades consegue produzir com o estoque atual
function calcProductionCapacity(recipe) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return Infinity;
    let minBatches = Infinity;
    recipe.ingredients.forEach(ri => {
        const ing = state.ingredients.find(i => i.id === ri.ingId);
        if (ing && ri.amount > 0) {
            const batches = Math.floor(ing.qty / ri.amount);
            minBatches = Math.min(minBatches, batches);
        }
    });
    return minBatches === Infinity ? 0 : minBatches;
}

// Helper: gerar HTML do card de receita (reutilizável para as duas abas)
function buildRecipeCardHTML(r, showExport = true) {
    let ingredientsCost = 0;
    const missingIngredients = [];
    r.ingredients.forEach(ri => {
        const ing = state.ingredients.find(i => i.id === ri.ingId);
        if (ing) {
            ingredientsCost += ing.unit === 'un' ? ing.price * ri.amount : (ing.price / 1000) * ri.amount;
        } else {
            missingIngredients.push(ri.ingId);
        }
    });

    const prepTime = r.prep_time !== undefined && r.prep_time !== null ? parseFloat(r.prep_time) : 1.0;
    const laborRate = r.labor_rate !== undefined && r.labor_rate !== null ? parseFloat(r.labor_rate) : DEFAULT_HOURLY_RATE;
    const gasCost = r.gas_cost !== undefined && r.gas_cost !== null ? parseFloat(r.gas_cost) : 2.00;
    const packagingCost = r.packaging_cost !== undefined && r.packaging_cost !== null ? parseFloat(r.packaging_cost) : 5.00;
    const fixedOverhead = r.fixed_overhead !== undefined && r.fixed_overhead !== null ? parseFloat(r.fixed_overhead) : 1.00;

    const laborCost = prepTime * laborRate;
    const totalCost = ingredientsCost + laborCost + packagingCost + gasCost + fixedOverhead;

    const suggestedPrice = totalCost * (1 + (r.margin || 200) / 100);
    const pricePerUnit = suggestedPrice / (r.yield || 1);
    const capacity = calcProductionCapacity(r);
    const capacityBadge = capacity === 0
        ? `<span class="badge" style="background:var(--color-danger-light,#fee2e2);color:var(--color-danger);">🔴 Estoque insuficiente</span>`
        : `<span class="badge badge-success">🟢 Produz ${capacity} agora</span>`;

    const ingredientList = r.ingredients.map(ri => {
        const ing = state.ingredients.find(i => i.id === ri.ingId);
        if (!ing) return '';
        return `<li style="font-size:12px;color:var(--color-text-muted);">${ing.name}: <strong>${ri.amount}${ing.unit}</strong></li>`;
    }).join('');

    const exportBtn = `<button class="btn btn-purple btn-sm" style="width: 100%; margin-bottom: 8px; font-weight: 600;" onclick="exportToMenu('${r.id}')">✨ Colocar no Cardápio</button>`;

    return `
        <div class="recipe-card glass" style="border: 1px solid rgba(139,92,246,0.2); box-shadow: 0 8px 24px rgba(0,0,0,0.05); overflow: hidden; position: relative;">
            <div style="height: 6px; background: linear-gradient(90deg, var(--color-purple), var(--color-primary)); width: 100%; position: absolute; top: 0; left: 0;"></div>
            <div class="recipe-header" style="padding: 20px 20px 10px 20px;">
                <div style="flex: 1;">
                    <h3 style="font-size: 18px; margin-bottom: 6px; color: var(--color-text-main); font-weight: 700;">${r.name}</h3>
                    <span class="badge" style="background: var(--color-purple-light); color: var(--color-purple); border: 1px solid rgba(139,92,246,0.3); font-weight: 600;"><i style="margin-right:4px;">🥣</i> ${r.ingredients.length} Ingredientes</span>
                </div>
            </div>
            
            <div style="padding: 0 20px;">
                ${capacityBadge}
            </div>

            <div style="padding: 15px 20px;">
                <h4 style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px;">Ficha Técnica</h4>
                <ul style="margin:0; padding-left:0; list-style: none; display: flex; flex-direction: column; gap: 6px;">
                    ${r.ingredients.map(ri => {
                        const ing = state.ingredients.find(i => i.id === ri.ingId);
                        if (!ing) return '';
                        return `<li style="font-size:13px; color:var(--color-text-main); display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(0,0,0,0.05); padding-bottom: 4px;"><span>${ing.name}</span> <strong style="color: var(--color-purple);">${ri.amount}${ing.unit}</strong></li>`;
                    }).join('')}
                </ul>
            </div>

            <div style="background: rgba(139,92,246,0.03); border-top: 1px solid rgba(139,92,246,0.1); border-bottom: 1px solid rgba(139,92,246,0.1); padding: 15px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <span style="font-size: 11px; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase;">Custo Produção</span>
                    <div style="font-size: 16px; font-weight: 700; color: var(--color-text-main); margin-top: 4px;">R$ ${totalCost.toFixed(2)}</div>
                </div>
                <div style="text-align: right; position: relative;">
                    <div style="position: absolute; left: -8px; top: 10%; height: 80%; width: 1px; background: rgba(0,0,0,0.05);"></div>
                    <span style="font-size: 11px; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase;">Preço Sugerido / Un.</span>
                    <div style="font-size: 18px; font-weight: 800; color: var(--color-purple); margin-top: 4px;">R$ ${pricePerUnit.toFixed(2)}</div>
                </div>
            </div>

            <div style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--color-text-muted);">
                <div style="display: flex; gap: 12px;">
                    <span><i style="opacity: 0.7;">📦</i> Rende: <strong>${r.yield} un.</strong></span>
                    <span><i style="opacity: 0.7;">📈</i> Markup: <strong>${r.margin}%</strong></span>
                </div>
            </div>

            <div style="padding: 0 20px 20px 20px;">
                ${exportBtn}
                <button class="btn btn-outline" style="width: 100%; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3); font-size: 13px; font-weight: 600;" onclick="deleteRecipe('${r.id}')">Excluir Ficha Técnica</button>
            </div>
        </div>
    `;
}

function renderReceitas(searchQuery = "") {
    if (!state) return;
    // Aba Precificacao (lista antiga)
    const list = document.getElementById("recipes-list");
    // Aba Receitas (nova)
    const listTab = document.getElementById("recipes-list-tab");
    const capacityPanel = document.getElementById("production-capacity-panel");

    const filtered = state.recipes.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const emptyHTML = `<div class="empty-state" style="grid-column: 1/-1"><p>Nenhuma receita cadastrada. Clique em "+ Nova Receita" para começar! 🔬</p></div>`;

    if (list) {
        list.innerHTML = filtered.length === 0 ? emptyHTML : filtered.map(r => buildRecipeCardHTML(r, true)).join('');
    }

    if (listTab) {
        listTab.innerHTML = filtered.length === 0 ? emptyHTML : filtered.map(r => buildRecipeCardHTML(r, true)).join('');
    }

    // Painel de capacidade de produção
    if (capacityPanel && state.recipes.length > 0) {
        const items = state.recipes.map(r => {
            const cap = calcProductionCapacity(r);
            const color = cap === 0 ? 'var(--color-danger)' : cap < 3 ? '#f59e0b' : 'var(--color-success)';
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                <span style="font-size:22px;">🎂</span>
                <div>
                    <div style="font-weight:600;font-size:14px;">${r.name}</div>
                    <div style="font-size:12px;color:${color};font-weight:700;">${cap === 0 ? 'Estoque insuficiente' : `Consegue produzir ${cap} unidade${cap > 1 ? 's' : ''}`}</div>
                </div>
            </div>`;
        }).join('');
        capacityPanel.innerHTML = `
            <div class="panel-card glass" style="padding:16px;">
                <h3 style="margin-bottom:14px;font-size:15px;">⚡ Capacidade de Produção Atual</h3>
                <div style="display:flex;flex-wrap:wrap;gap:10px;">${items}</div>
            </div>`;
    }
}

// G. FINANCEIRO VIEW
function renderFinanceiro() {
    if (!state) return;
    const income = state.transactions.filter(t => t.type === "Entrada").reduce((sum, t) => sum + t.val, 0);
    const expense = state.transactions.filter(t => t.type === "Saída").reduce((sum, t) => sum + t.val, 0);
    const profit = income - expense;
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    
    if (dashboardChartInstance) {
        dashboardChartInstance.destroy();
    }
    
    const rootStyles = getComputedStyle(document.body);
    const colorSuccess = rootStyles.getPropertyValue('--color-success').trim() || '#10b981';
    const colorDanger = rootStyles.getPropertyValue('--color-danger').trim() || '#ef4444';
    const colorPurple = rootStyles.getPropertyValue('--color-purple').trim() || '#8b5cf6';
    const textColor = rootStyles.getPropertyValue('--color-text-main').trim() || '#334155';
    
    const profitColor = profit >= 0 ? colorPurple : colorDanger;

    dashboardChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Receitas', 'Despesas', 'Lucro'],
            datasets: [{
                label: 'Valor (R$)',
                data: [income, expense, profit],
                backgroundColor: [
                    colorSuccess,
                    colorDanger,
                    profitColor
                ],
                borderRadius: 6,
                barPercentage: 0.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let val = context.raw || 0;
                            return ' R$ ' + val.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        color: textColor
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            weight: 'bold'
                        }
                    }
                }
            }
        }
    });
}

// H. CACAU CHAT VIEW
function renderCacauChat() {
    if (!state) return;
    const chatContainer = document.getElementById("wa-messages-container");
    chatContainer.innerHTML = "";

    state.cacauMessages.forEach(m => {
        const isCacau = m.sender === "cacau";
        const msgDiv = document.createElement("div");
        msgDiv.className = `wa-msg ${isCacau ? 'incoming' : 'outgoing'}`;
        
        let formattedText = m.text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/• (.*?)(<br>|$)/g, '<li>$1</li>');

        msgDiv.innerHTML = `
            <div class="wa-msg-content">${formattedText}</div>
            <span class="wa-msg-time">${m.time}</span>
        `;
        
        const hasShoppingList = isCacau && (
            m.text.toLowerCase().includes("lista de compras") || 
            m.text.toLowerCase().includes("estoque baixo") || 
            m.text.includes("•")
        );
        
        if (hasShoppingList) {
            const btn = document.createElement("button");
            btn.className = "btn-download-chat-list";
            btn.innerHTML = "📥 Baixar Lista (TXT)";
            btn.style.marginTop = "8px";
            btn.style.fontSize = "11px";
            btn.style.padding = "4px 8px";
            btn.style.border = "none";
            btn.style.borderRadius = "4px";
            btn.style.backgroundColor = "var(--color-primary, #db8876)";
            btn.style.color = "#fff";
            btn.style.cursor = "pointer";
            btn.style.display = "flex";
            btn.style.alignItems = "center";
            btn.style.gap = "4px";
            btn.style.transition = "background-color 0.2s";
            
            btn.addEventListener("mouseover", () => {
                btn.style.backgroundColor = "var(--color-primary-hover, #c77b6a)";
            });
            btn.addEventListener("mouseout", () => {
                btn.style.backgroundColor = "var(--color-primary, #db8876)";
            });
            
            btn.addEventListener("click", () => {
                window.downloadShoppingList(m.text);
            });
            msgDiv.appendChild(btn);
        }
        
        chatContainer.appendChild(msgDiv);
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
}


// ================= 7. DATABASE OPERATIONS (HYBRID STATE CONTROLLERS) =================

// A. Product CRUD
async function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("prod-id").value;
    const name = document.getElementById("prod-name").value;
    const price = parseFloat(document.getElementById("prod-price").value) || 0;
    const category = document.getElementById("prod-category").value;
    const desc = document.getElementById("prod-desc").value;
    const emoji = document.getElementById("prod-image").value;
    const recipeId = document.getElementById("prod-recipe")?.value || "";
    let photo = document.getElementById("prod-photo-base64").value || null;
    const destacado = document.getElementById("prod-destacado")?.checked || false;
    const badgeDestaque = document.getElementById("prod-badge-destaque")?.value.trim() || "";

    const targetId = id || "p_" + Date.now();
    
    // Se for edição e não houver nova foto, mantemos a antiga
    if (id && !photo) {
        const existingProd = state.products.find(p => p.id === id);
        if (existingProd && existingProd.photo) {
            photo = existingProd.photo;
        }
    }

    const newProduct = { 
        id: targetId, 
        name, 
        price, 
        category, 
        desc, 
        description: desc,
        emoji,
        photo,
        recipeId: recipeId || null,
        destacado,
        badgeDestaque
    };

    if (id) {
        const idx = state.products.findIndex(p => p.id === id);
        if (idx !== -1) state.products[idx] = newProduct;
    } else {
        state.products.push(newProduct);
    }
    saveToLocalStorage();
    closeModal("modal-product");
    renderActiveTab();

    if (isSupabaseActive) {
        try {
            const loggedInUserId = getLoggedInUserId();
            if (id) {
                let query = supabaseClient.from('produtos').update({ 
                    name, 
                    price, 
                    category, 
                    description: desc, 
                    emoji, 
                    photo, 
                    recipe_id: recipeId || null,
                    destacado,
                    badge_destaque: badgeDestaque
                }).eq('id', id);
                if (loggedInUserId) query = query.eq('usuario_id', loggedInUserId);
                await query;
            } else {
                const payload = { 
                    id: targetId, 
                    name, 
                    price, 
                    category, 
                    description: desc, 
                    emoji, 
                    photo, 
                    recipe_id: recipeId || null,
                    destacado,
                    badge_destaque: badgeDestaque
                };
                if (loggedInUserId) payload.usuario_id = loggedInUserId;
                await supabaseClient.from('produtos').insert([payload]);
            }
        } catch (err) {
            console.error("Erro ao sincronizar produto:", err);
        }
    }
}

function editProduct(id, highlightRecipe = false) {
    const prod = state.products.find(p => p.id === id);
    if (!prod) return;

    document.getElementById("prod-id").value = prod.id;
    document.getElementById("prod-name").value = prod.name;
    document.getElementById("prod-price").value = prod.price;
    document.getElementById("prod-category").value = prod.category;
    document.getElementById("prod-desc").value = prod.desc || prod.description || "";
    document.getElementById("prod-image").value = prod.emoji;
    
    const destCheckbox = document.getElementById("prod-destacado");
    if (destCheckbox) destCheckbox.checked = prod.destacado || false;
    const badgeInput = document.getElementById("prod-badge-destaque");
    if (badgeInput) badgeInput.value = prod.badgeDestaque || prod.badge_destaque || "";
    
    document.getElementById("prod-photo-input").value = "";
    document.getElementById("prod-photo-base64").value = "";
    if (prod.photo) {
        document.getElementById("prod-photo-preview").src = prod.photo;
        document.getElementById("prod-photo-preview-container").style.display = "block";
    } else {
        document.getElementById("prod-photo-preview").src = "";
        document.getElementById("prod-photo-preview-container").style.display = "none";
    }

    // Popular select de receitas e selecionar a vinculada
    const recipeSelect = document.getElementById("prod-recipe");
    if (recipeSelect) {
        populateRecipeSelect(recipeSelect, prod.recipeId || "");
    }

    document.getElementById("product-modal-title").innerText = "Editar Produto";
    openModal("modal-product");

    if (highlightRecipe) {
        setTimeout(() => {
            const recipeSelect = document.getElementById("prod-recipe");
            if (recipeSelect) {
                recipeSelect.focus();
                recipeSelect.style.border = "2px solid #ea580c";
                recipeSelect.style.boxShadow = "0 0 0 3px rgba(234, 88, 12, 0.2)";
                setTimeout(() => {
                    recipeSelect.style.border = "";
                    recipeSelect.style.boxShadow = "";
                }, 2000);
            }
        }, 300);
    }
}

async function deleteProduct(id) {
    if (confirm("Deseja realmente excluir este produto? Isso não afetará os pedidos já registrados.")) {
        // 1. Update state instantly
        state.products = state.products.filter(p => p.id !== id);
        saveToLocalStorage();
        renderActiveTab();

        // 2. Background sync
        if (isSupabaseActive) {
            try {
                const loggedInUserId = getLoggedInUserId();
                let query = supabaseClient.from('produtos').delete().eq('id', id);
                if (loggedInUserId) {
                    query = query.eq('usuario_id', loggedInUserId);
                }
                await query;
                console.log("Produto excluído do Supabase no plano de fundo.");
            } catch (err) {
                console.error("Erro ao excluir produto:", err);
            }
        }
    }
}

// B. Ingredient CRUD
async function handleIngredientSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("ing-name").value;
    const qty = parseFloat(document.getElementById("ing-qty").value) || 0;
    const unit = document.getElementById("ing-unit").value;
    const min = parseFloat(document.getElementById("ing-min").value) || 0;
    const price = parseFloat(document.getElementById("ing-price").value) || 0;

    const newId = "i_" + Date.now();
    const newIngredient = { id: newId, name, qty, unit, min, price };

    // 1. Update locally instantly
    state.ingredients.push(newIngredient);
    saveToLocalStorage();

    closeModal("modal-ingredient");
    document.getElementById("form-ingredient").reset();
    renderActiveTab();

    // 2. Background sync
    if (isSupabaseActive) {
        try {
            const loggedInUserId = getLoggedInUserId();
            const payload = { id: newId, name, qty, unit, min, price };
            if (loggedInUserId) {
                payload.usuario_id = loggedInUserId;
            }
            await supabaseClient.from('estoque').insert([payload]);
            console.log("Ingrediente sincronizado com Supabase no plano de fundo.");
        } catch (err) {
            console.error("Erro ao sincronizar ingrediente:", err);
        }
    }
}

// Real AI OCR processor using Serverless route
async function processReceiptOCR(file) {
    if (!file) return;

    const uploadArea = document.getElementById("receipt-upload-area");
    const loadingArea = document.getElementById("receipt-loading-area");
    const fileInput = document.getElementById("receipt-file-input");

    if (uploadArea) uploadArea.style.display = "none";
    if (loadingArea) loadingArea.style.display = "block";

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result;
        
        try {
            const response = await fetch("/api/scan-receipt", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    imageBase64: base64Data,
                    mimeType: file.type
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Erro desconhecido no processamento");
            }

            const data = await response.json();
            
            if (data && data.items && data.items.length > 0) {
                const mainItem = data.items[0];

                if (uploadArea) uploadArea.style.display = "block";
                if (loadingArea) loadingArea.style.display = "none";
                if (fileInput) fileInput.value = "";
                closeModal("modal-receipt-scanner");

                // Fill details into the modal
                document.getElementById("ing-name").value = mainItem.name || "";
                document.getElementById("ing-qty").value = mainItem.qty || "1";
                document.getElementById("ing-unit").value = mainItem.unit || "un";
                document.getElementById("ing-price").value = mainItem.price ? parseFloat(mainItem.price).toFixed(2) : "0.00";
                document.getElementById("ing-min").value = "1";

                openModal("modal-ingredient");

                setTimeout(() => {
                    alert(`Nota lida com sucesso via IA! Identificamos o item "${mainItem.name}". Verifique os dados e clique em Salvar.`);
                }, 300);

            } else {
                throw new Error("Nenhum ingrediente foi extraído da nota fiscal.");
            }

        } catch (err) {
            console.warn("Erro ao usar o scanner de IA real, ativando fallback simulado:", err);
            if (uploadArea) uploadArea.style.display = "block";
            if (loadingArea) loadingArea.style.display = "none";
            if (fileInput) fileInput.value = "";
            
            alert("A IA do leitor de notas não pôde processar este cupom agora (API Key ausente ou limite excedido). Usando simulação local...");
            simulateReceiptOCR();
        }
    };
    reader.onerror = () => {
        alert("Falha ao ler o arquivo de imagem local.");
        if (uploadArea) uploadArea.style.display = "block";
        if (loadingArea) loadingArea.style.display = "none";
    };
    reader.readAsDataURL(file);
}

// Simulate AI OCR for Receipt Scanner
function simulateReceiptOCR() {
    const uploadArea = document.getElementById("receipt-upload-area");
    const loadingArea = document.getElementById("receipt-loading-area");
    const fileInput = document.getElementById("receipt-file-input");

    uploadArea.style.display = "none";
    loadingArea.style.display = "block";

    setTimeout(() => {
        // Reset modal state
        uploadArea.style.display = "block";
        loadingArea.style.display = "none";
        fileInput.value = "";
        closeModal("modal-receipt-scanner");

        // Open Ingredient Modal with mocked data
        document.getElementById("ing-name").value = "Leite Condensado Moça";
        document.getElementById("ing-qty").value = "3";
        document.getElementById("ing-unit").value = "un";
        document.getElementById("ing-price").value = "21.50";
        document.getElementById("ing-min").value = "1";
        
        openModal("modal-ingredient");
        
        // Brief success message
        setTimeout(() => alert("Nota lida com sucesso! Verifique os dados e clique em Salvar."), 300);
    }, 3000);
}

async function quickAddStock(id) {
    const ing = state.ingredients.find(i => i.id === id);
    if (!ing) return;

    const addVal = prompt(`Quantos (${ing.unit}) de ${ing.name} você comprou para adicionar ao estoque?`, "1000");
    const num = parseFloat(addVal);
    if (isNaN(num) || num <= 0) return;

    const newQty = ing.qty + num;
    const expense = num * (ing.price / 1000);
    const transId = "t_" + Date.now();
    const transDate = getLocalDateStr();
    const transDesc = `Estoque: +${num}${ing.unit} de ${ing.name}`;

    // 1. Update locally instantly
    ing.qty = newQty;
    state.transactions.push({
        id: transId,
        date: transDate,
        desc: transDesc,
        type: "Saída",
        category: "Ingredientes",
        val: expense
    });
    saveToLocalStorage();
    renderActiveTab();

    // 2. Background sync
    if (isSupabaseActive) {
        try {
            const loggedInUserId = getLoggedInUserId();
            let stockQuery = supabaseClient.from('estoque').update({ qty: newQty }).eq('id', id);
            if (loggedInUserId) {
                stockQuery = stockQuery.eq('usuario_id', loggedInUserId);
            }
            const transPayload = {
                id: transId,
                date: transDate,
                desc: transDesc,
                type: "Saída",
                category: "Ingredientes",
                val: expense
            };
            if (loggedInUserId) {
                transPayload.usuario_id = loggedInUserId;
            }
            await Promise.all([
                stockQuery,
                supabaseClient.from('transacoes').insert([transPayload])
            ]);
            console.log("Estoque rápido sincronizado com Supabase no plano de fundo.");
        } catch (err) {
            console.error("Erro ao sincronizar estoque rápido:", err);
        }
    }
}

async function deleteIngredient(id) {
    if (confirm("Tem certeza que deseja remover este ingrediente?")) {
        // 1. Update locally instantly
        state.ingredients = state.ingredients.filter(i => i.id !== id);
        saveToLocalStorage();
        renderActiveTab();

        // 2. Background sync
        if (isSupabaseActive) {
            try {
                const loggedInUserId = getLoggedInUserId();
                let query = supabaseClient.from('estoque').delete().eq('id', id);
                if (loggedInUserId) {
                    query = query.eq('usuario_id', loggedInUserId);
                }
                await query;
                console.log("Ingrediente excluído do Supabase no plano de fundo.");
            } catch (err) {
                console.error("Erro ao excluir ingrediente:", err);
            }
        }
    }
}


// C. Client CRUD
async function handleClientSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("cli-name").value;
    const phone = document.getElementById("cli-phone").value.replace(/\D/g, "");

    const newId = "c_" + Date.now();
    const newClient = { id: newId, name, phone, orderCount: 0, totalSpent: 0 };

    // 1. Update locally instantly
    state.clients.push(newClient);
    saveToLocalStorage();

    // 2. Clear UI instantly
    closeModal("modal-client");
    document.getElementById("form-client").reset();
    renderActiveTab();

    // 3. Background sync
    if (isSupabaseActive) {
        try {
            const loggedInUserId = getLoggedInUserId();
            const payload = { id: newId, name, phone, order_count: 0, total_spent: 0 };
            if (loggedInUserId) {
                payload.usuario_id = loggedInUserId;
            }
            await supabaseClient.from('clientes').insert([payload]);
            console.log("Cliente sincronizado com Supabase no plano de fundo.");
        } catch (err) {
            console.error("Erro ao sincronizar cliente:", err);
        }
    }
}

window.openClientHistoryModal = function(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) {
        alert("Cliente não encontrado.");
        return;
    }

    const titleEl = document.getElementById("client-history-title");
    if (titleEl) {
        titleEl.innerText = `Histórico de Pedidos - ${client.name}`;
    }

    const contentEl = document.getElementById("client-history-content");
    if (!contentEl) return;

    // Filter client orders
    const clientOrders = state.orders.filter(o => o.clientId === clientId || o.client_id === clientId)
        .sort((a, b) => new Date(b.date + "T" + (b.time || "00:00")) - new Date(a.date + "T" + (a.time || "00:00")));

    if (clientOrders.length === 0) {
        contentEl.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 32px;">📦</span>
                <p style="margin-top: 10px;">Nenhum pedido registrado para este cliente ainda.</p>
            </div>
        `;
    } else {
        let rowsHtml = "";
        clientOrders.forEach(o => {
            const product = state.products.find(p => p.id === o.productId);
            let productName = "Bolo Personalizado 🎂";
            if (o.productId !== "custom_cake") {
                productName = product ? product.name : "Doce / Outro";
            }
            
            // Format Date
            let dateFormatted = o.date;
            try {
                const parts = o.date.split('-');
                if (parts.length === 3) {
                    dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            } catch (e) {}

            // Format status badge styles
            let badgeStyle = "padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;";
            if (o.status === "Recebido") {
                badgeStyle += " background-color: #e0f2fe; color: #0369a1;";
            } else if (o.status === "Em Produção") {
                badgeStyle += " background-color: #fef3c7; color: #b45309;";
            } else if (o.status === "Pronto") {
                badgeStyle += " background-color: #dcfce7; color: #15803d;";
            } else if (o.status === "Entregue") {
                badgeStyle += " background-color: #f1f5f9; color: #475569;";
            } else {
                badgeStyle += " background-color: #f1f5f9; color: #475569;";
            }

            rowsHtml += `
                <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <td style="padding: 12px 8px; font-size: 13px;">${dateFormatted} ${o.time || ''}</td>
                    <td style="padding: 12px 8px; font-size: 13px;"><strong>${productName}</strong><br><small style="color: var(--color-text-muted);">${o.notes || ''}</small></td>
                    <td style="padding: 12px 8px; text-align: center; font-size: 13px;">${o.qty}</td>
                    <td style="padding: 12px 8px; text-align: right; font-size: 13px;"><strong>R$ ${parseFloat(o.val).toFixed(2)}</strong></td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <span style="${badgeStyle}">${o.status}</span>
                    </td>
                </tr>
            `;
        });

        contentEl.innerHTML = `
            <div class="table-container">
                <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--color-border); text-align: left;">
                            <th style="padding: 8px; font-size: 11px;">Data/Hora</th>
                            <th style="padding: 8px; font-size: 11px;">Produto / Detalhes</th>
                            <th style="padding: 8px; font-size: 11px; text-align: center;">Qtd</th>
                            <th style="padding: 8px; font-size: 11px; text-align: right;">Valor</th>
                            <th style="padding: 8px; font-size: 11px; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    openModal("modal-client-history");
};

async function deleteClient(id) {
    if (confirm("Deseja realmente excluir este cliente?")) {
        // 1. Update locally instantly
        state.clients = state.clients.filter(c => c.id !== id);
        saveToLocalStorage();
        renderActiveTab();

        // 2. Background sync
        if (isSupabaseActive) {
            try {
                const loggedInUserId = getLoggedInUserId();
                let query = supabaseClient.from('clientes').delete().eq('id', id);
                if (loggedInUserId) {
                    query = query.eq('usuario_id', loggedInUserId);
                }
                await query;
                console.log("Cliente excluído do Supabase no plano de fundo.");
            } catch (err) {
                console.error("Erro ao excluir cliente:", err);
            }
        }
    }
}

// B. Global Functions (Export to Menu)
window.exportToMenu = function(recipeId) {
    const r = state.recipes.find(rec => rec.id === recipeId);
    if (!r) return;

    // Calculate suggested price
    let totalCost = 0;
    r.ingredients.forEach(ri => {
        const ing = state.ingredients.find(i => i.id === ri.ingId);
        if (ing) {
            totalCost += ing.unit === 'un' ? ing.price * ri.amount : (ing.price / 1000) * ri.amount;
        }
    });
    const suggestedPrice = (totalCost * (1 + (r.margin || 200) / 100)) / (r.yield || 1);

    // Populate Modal
    document.getElementById("prod-id").value = ""; // Force new product
    document.getElementById("prod-name").value = r.name;
    document.getElementById("prod-price").value = suggestedPrice.toFixed(2);
    document.getElementById("prod-desc").value = `Produzido a partir da ficha técnica: ${r.name}`;
    
    const destCheckbox = document.getElementById("prod-destacado");
    if (destCheckbox) destCheckbox.checked = false;
    const badgeInput = document.getElementById("prod-badge-destaque");
    if (badgeInput) badgeInput.value = "";
    
    // Ensure the recipe dropdown has the options populated first
    populateRecipeSelect(document.getElementById("prod-recipe"), recipeId);
    
    const recipeSelect = document.getElementById("prod-recipe");
    if (recipeSelect) {
        recipeSelect.value = recipeId;
    }

    document.getElementById("product-modal-title").innerText = "Adicionar ao Cardápio";
    openModal("modal-product");
};

// C. Order CRUD
async function handleOrderSubmit(e) {
    e.preventDefault();
    const clientId = document.getElementById("ord-client").value;
    const productId = document.getElementById("ord-product").value;
    const qty = parseInt(document.getElementById("ord-qty").value) || 1;
    const val = parseFloat(document.getElementById("ord-price").value) || 0;
    const date = document.getElementById("ord-date").value;
    const time = document.getElementById("ord-time").value;
    const notes = document.getElementById("ord-notes").value;
    const tag = document.getElementById("ord-tag") ? document.getElementById("ord-tag").value : "";

    const newId = "o_" + Date.now();
    const newOrder = { id: newId, clientId, productId, qty, val, date, time, status: "Recebido", notes, tag };

    // 1. Update locally instantly
    state.orders.push(newOrder);
    const client = state.clients.find(c => c.id === clientId);
    let newCount = 0;
    let newSpent = 0;
    if (client) {
        client.orderCount++;
        client.totalSpent += val;
        newCount = client.orderCount;
        newSpent = client.totalSpent;
    }
    saveToLocalStorage();

    // 2. Clear UI instantly
    closeModal("modal-order");
    document.getElementById("form-order").reset();
    renderActiveTab();

    // 3. Background sync
    if (isSupabaseActive) {
        try {
            const loggedInUserId = getLoggedInUserId();
            const formattedTime = time.includes(":") && time.split(":").length === 2 ? time + ":00" : time;
            const orderPayload = {
                id: newId,
                client_id: clientId,
                product_id: productId,
                qty: qty,
                val: val,
                date: date,
                time: formattedTime,
                status: "Recebido",
                notes: notes
            };
            if (loggedInUserId) {
                orderPayload.usuario_id = loggedInUserId;
            }
            await supabaseClient.from('pedidos').insert([orderPayload]);

            if (client) {
                let clientUpdateQuery = supabaseClient.from('clientes').update({ order_count: newCount, total_spent: newSpent }).eq('id', clientId);
                if (loggedInUserId) {
                    clientUpdateQuery = clientUpdateQuery.eq('usuario_id', loggedInUserId);
                }
                await clientUpdateQuery;
            }
            console.log("Pedido sincronizado com Supabase no plano de fundo.");
        } catch (err) {
            console.error("Erro ao sincronizar pedido:", err);
        }
    }
}

async function deleteOrder(id) {
    if (confirm("Remover esta encomenda do sistema?")) {
        const order = state.orders.find(o => o.id === id);
        let clientId = null;
        let newCount = 0;
        let newSpent = 0;

        if (order) {
            clientId = order.clientId;
            const client = state.clients.find(c => c.id === clientId);
            if (client) {
                client.orderCount = Math.max(0, client.orderCount - 1);
                client.totalSpent = Math.max(0, client.totalSpent - order.val);
                newCount = client.orderCount;
                newSpent = client.totalSpent;
            }
        }

        // 1. Update locally instantly
        state.orders = state.orders.filter(o => o.id !== id);
        state.transactions = state.transactions.filter(t => !(t.desc && t.desc.includes(`Pedido: ${id}`)));
        saveToLocalStorage();
        renderActiveTab();

        // 2. Background sync
        if (isSupabaseActive) {
            try {
                const loggedInUserId = getLoggedInUserId();
                let deleteOrderQuery = supabaseClient.from('pedidos').delete().eq('id', id);
                if (loggedInUserId) {
                    deleteOrderQuery = deleteOrderQuery.eq('usuario_id', loggedInUserId);
                }
                const promises = [deleteOrderQuery];

                let deleteTransQuery = supabaseClient.from('transacoes').delete().like('desc', `%Pedido: ${id}%`);
                if (loggedInUserId) {
                    deleteTransQuery = deleteTransQuery.eq('usuario_id', loggedInUserId);
                }
                promises.push(deleteTransQuery);

                if (clientId) {
                    let clientUpdateQuery = supabaseClient.from('clientes').update({ order_count: newCount, total_spent: newSpent }).eq('id', clientId);
                    if (loggedInUserId) {
                        clientUpdateQuery = clientUpdateQuery.eq('usuario_id', loggedInUserId);
                    }
                    promises.push(clientUpdateQuery);
                }
                await Promise.all(promises);
                console.log("Exclusão de pedido sincronizada com Supabase no plano de fundo.");
            } catch (err) {
                console.error("Erro ao sincronizar exclusão de pedido:", err);
            }
        }
    }
}

// Kanban Status Moving Control
function openWhatsAppForOrder(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    const client = state.clients.find(c => c.id === order.clientId);
    if (!client || !client.phone) {
        alert("Cliente não encontrado ou sem telefone cadastrado.");
        return;
    }
    
    let prodName = "sua encomenda";
    if (order.productId === "custom_cake") {
        prodName = "Bolo Personalizado";
        if (order.notes && order.notes.includes("Bolo Personalizado:")) {
            const lines = order.notes.split('\n');
            const customTitleLine = lines.find(l => l.includes("Bolo Personalizado:"));
            if (customTitleLine) {
                prodName = customTitleLine.replace("Bolo Personalizado:", "").trim();
            }
        }
    } else {
        const product = state.products.find(p => p.id === order.productId);
        prodName = product ? product.name : "sua encomenda";
    }
    
    let message = "";
    if (order.status === "Em Produção") {
        message = `Olá, ${client.name}! Passando para avisar que já começamos a preparar o seu pedido (${order.qty}x ${prodName}) com muito carinho! 🧁 Em breve avisaremos quando estiver pronto.`;
    } else if (order.status === "Pronto") {
        message = `Boas notícias, ${client.name}! Seu pedido (${order.qty}x ${prodName}) já está pronto e embalado para retirada! 🎉 Te aguardamos.`;
    } else {
        message = `Olá, ${client.name}! Tudo bem? Referente ao seu pedido de ${prodName}...`;
    }
    
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/55${client.phone}?text=${encodedMsg}`, "_blank");
}

async function moveOrderStatus(id, direction) {
    const order = state.orders.find(o => o.id === id);
    if (!order) return;

    const stages = ["Recebido", "Em Produção", "Pronto", "Entregue"];
    const currIdx = stages.indexOf(order.status);
    
    if (direction === "next" && currIdx < stages.length - 1) {
        const nextStatus = stages[currIdx + 1];
        const transId = "t_" + Date.now();
        const transDate = getLocalDateStr();
        const prod = state.products.find(p => p.id === order.productId);
        const client = state.clients.find(c => c.id === order.clientId);
        const transDesc = `Entrega: ${prod ? prod.name : 'Doce'} - Cliente: ${client ? client.name : 'Convidado'} (Pedido: ${order.id})`;

        // 1. Update locally instantly
        order.status = nextStatus;
        if (nextStatus === "Entregue") {
            state.transactions.push({
                id: transId,
                date: transDate,
                desc: transDesc,
                type: "Entrada",
                category: "Vendas",
                val: order.val
            });
            // Desconta os ingredientes do estoque automaticamente
            await deductStockForOrder(order);
        }
        
        saveToLocalStorage();
        renderActiveTab();


        // 2. Background sync
        if (isSupabaseActive) {
            (async () => {
                try {
                    const loggedInUserId = getLoggedInUserId();
                    let updateOrderQuery = supabaseClient.from('pedidos').update({ status: nextStatus }).eq('id', id);
                    if (loggedInUserId) {
                        updateOrderQuery = updateOrderQuery.eq('usuario_id', loggedInUserId);
                    }
                    await updateOrderQuery;
                    if (nextStatus === "Entregue") {
                        const transPayload = {
                            id: transId,
                            date: transDate,
                            desc: transDesc,
                            type: "Entrada",
                            category: "Vendas",
                            val: order.val
                        };
                        if (loggedInUserId) {
                            transPayload.usuario_id = loggedInUserId;
                        }
                        await supabaseClient.from('transacoes').insert([transPayload]);
                    }
                    console.log("Status de pedido (next) sincronizado com Supabase.");
                } catch (err) {
                    console.error("Erro ao sincronizar status de pedido (next):", err);
                }
            })();
        }
    } else if (direction === "prev" && currIdx > 0) {
        const prevStatus = stages[currIdx - 1];
        const wasEntregue = order.status === "Entregue";

        // 1. Update locally instantly
        if (wasEntregue) {
            state.transactions = state.transactions.filter(t => 
                !(t.desc.includes(`Pedido: ${order.id}`))
            );
        }
        order.status = prevStatus;
        saveToLocalStorage();
        renderActiveTab();

        // 2. Background sync
        if (isSupabaseActive) {
            (async () => {
                try {
                    const loggedInUserId = getLoggedInUserId();
                    let updateOrderQuery = supabaseClient.from('pedidos').update({ status: prevStatus }).eq('id', id);
                    if (loggedInUserId) {
                        updateOrderQuery = updateOrderQuery.eq('usuario_id', loggedInUserId);
                    }
                    await updateOrderQuery;
                    if (wasEntregue) {
                        let deleteTransQuery = supabaseClient.from('transacoes').delete().like('desc', `%Pedido: ${order.id}%`);
                        if (loggedInUserId) {
                            deleteTransQuery = deleteTransQuery.eq('usuario_id', loggedInUserId);
                        }
                        await deleteTransQuery;
                    }
                    console.log("Status de pedido (prev) sincronizado com Supabase.");
                } catch (err) {
                    console.error("Erro ao sincronizar status de pedido (prev):", err);
                }
            })();
        }
    }
}

// Drag & Drop Kanban Handlers (SortableJS Integration)
async function updateOrderStatus(orderId, targetStatus) {
    const order = state.orders.find(o => o.id === orderId);
    
    if (order && order.status !== targetStatus) {
        const wasEntregue = order.status === "Entregue";
        const transId = "t_" + Date.now();
        const transDate = getLocalDateStr();
        const prod = state.products.find(p => p.id === order.productId);
        const client = state.clients.find(c => c.id === order.clientId);
        const transDesc = `Entrega: ${prod ? prod.name : 'Doce'} - Cliente: ${client ? client.name : 'Convidado'} (Pedido: ${order.id})`;

        // 1. Update locally instantly
        order.status = targetStatus;
        if (targetStatus === "Entregue" && !wasEntregue) {
            state.transactions.push({
                id: transId,
                date: transDate,
                desc: transDesc,
                type: "Entrada",
                category: "Vendas",
                val: order.val
            });
            // Desconta os ingredientes do estoque automaticamente
            await deductStockForOrder(order);
        } else if (wasEntregue && targetStatus !== "Entregue") {
            state.transactions = state.transactions.filter(t => 
                !(t.desc.includes(`Pedido: ${order.id}`))
            );
        }
        saveToLocalStorage();
        renderActiveTab();

        // 2. Background sync
        if (isSupabaseActive) {
            (async () => {
                try {
                    const loggedInUserId = getLoggedInUserId();
                    let updateOrderQuery = supabaseClient.from('pedidos').update({ status: targetStatus }).eq('id', orderId);
                    if (loggedInUserId) {
                        updateOrderQuery = updateOrderQuery.eq('usuario_id', loggedInUserId);
                    }
                    await updateOrderQuery;
                    if (targetStatus === "Entregue" && !wasEntregue) {
                        const transPayload = {
                            id: transId,
                            date: transDate,
                            desc: transDesc,
                            type: "Entrada",
                            category: "Vendas",
                            val: order.val
                        };
                        if (loggedInUserId) {
                            transPayload.usuario_id = loggedInUserId;
                        }
                        await supabaseClient.from('transacoes').insert([transPayload]);
                    } else if (wasEntregue && targetStatus !== "Entregue") {
                        let deleteTransQuery = supabaseClient.from('transacoes').delete().like('desc', `%Pedido: ${order.id}%`);
                        if (loggedInUserId) {
                            deleteTransQuery = deleteTransQuery.eq('usuario_id', loggedInUserId);
                        }
                        await deleteTransQuery;
                    }
                    console.log("Movimentação drag and drop sincronizada com Supabase.");
                } catch (err) {
                    console.error("Erro ao sincronizar drag and drop:", err);
                }
            })();
        }
    }
}

// E. Transaction CRUD
async function handleTransactionSubmit(e) {
    e.preventDefault();
    const desc = document.getElementById("fin-desc").value;
    const type = document.getElementById("fin-type").value;
    const val = parseFloat(document.getElementById("fin-val").value) || 0;
    const category = document.getElementById("fin-cat").value;
    const date = document.getElementById("fin-date").value;

    const newId = "t_" + Date.now();
    const newTransaction = { id: newId, desc, type, val, category, date };

    // 1. Update locally instantly
    state.transactions.push(newTransaction);
    saveToLocalStorage();

    // 2. Clear UI instantly
    closeModal("modal-transaction");
    document.getElementById("form-transaction").reset();
    renderActiveTab();

    // 3. Background sync
    if (isSupabaseActive) {
        try {
            const loggedInUserId = getLoggedInUserId();
            const payload = { id: newId, desc, type, val, category, date };
            if (loggedInUserId) {
                payload.usuario_id = loggedInUserId;
            }
            await supabaseClient.from('transacoes').insert([payload]);
            console.log("Transação sincronizada com Supabase no plano de fundo.");
        } catch (err) {
            console.error("Erro ao sincronizar transação:", err);
        }
    }
}

// F. Recipe Cost Calculator Creator
let recipeRowsCount = 0;
function addRecipeIngredientRow() {
    const listDiv = document.getElementById("recipe-ingredients-list-inputs");
    const rowId = "rec-row-" + recipeRowsCount++;

    const row = document.createElement("div");
    row.className = "recipe-ing-row";
    row.id = rowId;

    let ingredientOptions = "";
    state.ingredients.forEach(i => {
        ingredientOptions += `<option value="${i.id}">${i.name} (Custo: R$ ${i.price.toFixed(2)}/${i.unit})</option>`;
    });

    row.innerHTML = `
        <select class="recipe-ing-select" onchange="calculateRecipeCostsInRealTime()" required>
            <option value="">Selecione ingrediente...</option>
            ${ingredientOptions}
        </select>
        <input type="number" class="recipe-ing-qty" placeholder="Qtd" oninput="calculateRecipeCostsInRealTime()" required>
        <span class="recipe-ing-unit-badge badge">g/un</span>
        <button type="button" class="btn-remove-row" onclick="removeRecipeIngredientRow('${rowId}')">&times;</button>
    `;

    listDiv.appendChild(row);
    
    const select = row.querySelector(".recipe-ing-select");
    select.addEventListener("change", (e) => {
        const ing = state.ingredients.find(i => i.id === e.target.value);
        if (ing) {
            row.querySelector(".recipe-ing-unit-badge").innerText = ing.unit;
        }
    });
}

function removeRecipeIngredientRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        calculateRecipeCostsInRealTime();
    }
}

function calculateRecipeCostsInRealTime() {
    const rows = document.querySelectorAll(".recipe-ing-row");
    let ingredientsCost = 0;

    rows.forEach(row => {
        const ingId = row.querySelector(".recipe-ing-select").value;
        const amt = parseFloat(row.querySelector(".recipe-ing-qty").value) || 0;
        
        if (ingId) {
            const ing = state.ingredients.find(i => i.id === ingId);
            if (ing) {
                if (ing.unit === "un") {
                    ingredientsCost += ing.price * amt;
                } else {
                    ingredientsCost += (ing.price / 1000) * amt;
                }
            }
        }
    });

    document.getElementById("rec-cost-calculated").innerText = `R$ ${ingredientsCost.toFixed(2)}`;

    // Read additional factors
    const prepTime = parseFloat(document.getElementById("rec-prep-time").value) || 0;
    const laborRate = parseFloat(document.getElementById("rec-labor-rate").value) || 0;
    const gasCost = parseFloat(document.getElementById("rec-gas-cost").value) || 0;
    const packagingCost = parseFloat(document.getElementById("rec-packaging-cost").value) || 0;
    const fixedOverhead = parseFloat(document.getElementById("rec-fixed-overhead").value) || 0;

    const laborCost = prepTime * laborRate;
    const totalCost = ingredientsCost + laborCost + packagingCost + gasCost + fixedOverhead;
    
    const totalCostEl = document.getElementById("rec-total-cost-calculated");
    if (totalCostEl) {
        totalCostEl.innerText = `R$ ${totalCost.toFixed(2)}`;
    }

    const yieldCount = parseInt(document.getElementById("rec-yield").value) || 1;
    const margin = parseFloat(document.getElementById("rec-margin").value) || 0;
    
    const suggestedPrice = totalCost * (1 + margin / 100);
    const sugSlice = suggestedPrice / yieldCount;

    document.getElementById("rec-suggested-slice").innerText = `R$ ${sugSlice.toFixed(2)}`;
    const sugWholeEl = document.getElementById("rec-suggested-whole");
    if (sugWholeEl) sugWholeEl.innerText = `R$ ${suggestedPrice.toFixed(2)}`;
    
    // Render donut chart
    renderRecipeChart(ingredientsCost, packagingCost, laborCost, gasCost, fixedOverhead, suggestedPrice - totalCost);
    
    return totalCost;
}

let recipeChartInstance = null;

function renderRecipeChart(ingCost, packCost, laborCost, gasCost, fixedCost, profit) {
    const ctx = document.getElementById('recipe-cost-chart');
    if (!ctx) return;
    
    if (recipeChartInstance) {
        recipeChartInstance.destroy();
    }
    
    // If everything is 0, don't show an empty chart
    if (ingCost === 0 && packCost === 0 && laborCost === 0 && gasCost === 0 && fixedCost === 0 && profit === 0) {
        return;
    }
    
    const rootStyles = getComputedStyle(document.body);
    const colorPrimary = rootStyles.getPropertyValue('--color-primary-hover').trim() || '#ff5d9e';
    const colorPurple = rootStyles.getPropertyValue('--color-purple').trim() || '#8b5cf6';
    const colorSuccess = rootStyles.getPropertyValue('--color-success').trim() || '#10b981';
    const colorWarning = '#f59e0b';
    const colorBlue = '#3b82f6';
    const colorSlate = '#94a3b8';
    
    // Ensure no negative profit in chart
    const safeProfit = Math.max(0, profit);

    recipeChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Ingredientes', 'Embalagem', 'Mão de Obra', 'Gás/Energia', 'Custos Fixos', 'Lucro Líquido'],
            datasets: [{
                data: [ingCost, packCost, laborCost, gasCost, fixedCost, safeProfit],
                backgroundColor: [
                    colorPrimary,
                    colorWarning,
                    colorPurple,
                    colorBlue,
                    colorSlate,
                    colorSuccess
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: { size: 11, family: "'Inter', sans-serif" },
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

async function handleRecipeSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("rec-name").value;
    const yieldCount = parseInt(document.getElementById("rec-yield").value) || 10;
    const margin = parseFloat(document.getElementById("rec-margin").value) || 200;

    const prepTime = parseFloat(document.getElementById("rec-prep-time").value) || 0;
    const laborRate = parseFloat(document.getElementById("rec-labor-rate").value) || 0;
    const gasCost = parseFloat(document.getElementById("rec-gas-cost").value) || 0;
    const packagingCost = parseFloat(document.getElementById("rec-packaging-cost").value) || 0;
    const fixedOverhead = parseFloat(document.getElementById("rec-fixed-overhead").value) || 0;

    const ingRows = document.querySelectorAll(".recipe-ing-row");
    const ingredients = [];

    ingRows.forEach(row => {
        const ingId = row.querySelector(".recipe-ing-select").value;
        const amount = parseFloat(row.querySelector(".recipe-ing-qty").value) || 0;
        if (ingId) {
            ingredients.push({ ingId, amount });
        }
    });

    const newId = "r_" + Date.now();
    const newRecipe = {
        id: newId,
        name,
        yield: yieldCount,
        ingredients,
        margin,
        prep_time: prepTime,
        labor_rate: laborRate,
        gas_cost: gasCost,
        packaging_cost: packagingCost,
        fixed_overhead: fixedOverhead
    };

    // 1. Update locally instantly
    state.recipes.push(newRecipe);
    saveToLocalStorage();

    // 2. Clear UI instantly
    closeModal("modal-recipe");
    renderActiveTab();

    // 3. Background sync
    if (isSupabaseActive) {
        try {
            const loggedInUserId = getLoggedInUserId();
            const payload = {
                id: newId,
                name,
                yield: yieldCount,
                ingredients,
                margin,
                prep_time: prepTime,
                labor_rate: laborRate,
                gas_cost: gasCost,
                packaging_cost: packagingCost,
                fixed_overhead: fixedOverhead
            };
            if (loggedInUserId) {
                payload.usuario_id = loggedInUserId;
            }
            await supabaseClient.from('receitas').insert([payload]);
            console.log("Receita sincronizada com Supabase no plano de fundo.");
        } catch (err) {
            console.error("Erro ao sincronizar receita:", err);
        }
    }
}

async function deleteRecipe(id) {
    if (confirm("Excluir esta ficha técnica de receita?")) {
        // 1. Update locally instantly
        state.recipes = state.recipes.filter(r => r.id !== id);
        saveToLocalStorage();
        renderActiveTab();

        // 2. Background sync
        if (isSupabaseActive) {
            try {
                const loggedInUserId = getLoggedInUserId();
                let query = supabaseClient.from('receitas').delete().eq('id', id);
                if (loggedInUserId) {
                    query = query.eq('usuario_id', loggedInUserId);
                }
                await query;
                console.log("Receita excluída do Supabase no plano de fundo.");
            } catch (err) {
                console.error("Erro ao excluir receita:", err);
            }
        }
    }
}

// exportRecipeToProduct removed

// ==========================================================================
// 11.B FIADOS & CONSIGNÇÕES OPERATIONS
// ==========================================================================

function renderFiados() {
    if (!state) return;
    const listEl = document.getElementById("fiados-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    const searchQuery = (document.getElementById("search-fiados").value || "").toLowerCase().trim();
    const filterStatus = document.getElementById("filter-fiado-status").value;
    const filterType = document.getElementById("filter-fiado-type").value;

    let pendingTotal = 0;
    let paidTotal = 0;
    const uniqueDebtors = new Set();
    let consignmentCount = 0;

    // Filter and display
    const filtered = state.fiados.filter(f => {
        // Search filter
        const matchSearch = !searchQuery || f.clientName.toLowerCase().includes(searchQuery) || (f.description || "").toLowerCase().includes(searchQuery);
        
        // Status filter
        const matchStatus = filterStatus === "Todos" || f.status === filterStatus;
        
        // Type filter
        const matchType = filterType === "Todos" || f.type === filterType;

        return matchSearch && matchStatus && matchType;
    });

    // Sort by date descending (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate overall stats from ALL fiados (not just filtered ones)
    state.fiados.forEach(f => {
        if (f.status === "Pendente") {
            pendingTotal += f.totalVal;
            uniqueDebtors.add(f.clientName.toLowerCase().trim());
            if (f.type === "Consignação") {
                consignmentCount++;
            }
        } else if (f.status === "Pago") {
            paidTotal += f.totalVal;
        }
    });

    // Update stats UI
    document.getElementById("fiado-stat-pending").innerText = `R$ ${pendingTotal.toFixed(2)}`;
    document.getElementById("fiado-stat-paid").innerText = `R$ ${paidTotal.toFixed(2)}`;
    document.getElementById("fiado-stat-debtors").innerText = uniqueDebtors.size;
    document.getElementById("fiado-stat-consignments").innerText = consignmentCount;

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--color-text-muted); padding: 30px;">
                    🔍 Nenhum fiado ou consignação encontrado com os filtros ativos.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(f => {
        const dateFormatted = f.date ? new Date(f.date).toLocaleDateString('pt-BR') : '—';
        const dueDateFormatted = f.dueDate ? new Date(f.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo';
        
        // Check if overdue
        const isOverdue = f.status === "Pendente" && f.dueDate && new Date(f.dueDate) < new Date(new Date().setHours(0,0,0,0));
        const dueDateStyle = isOverdue ? "color: var(--color-danger); font-weight: bold;" : "";
        const dueDateDisplay = isOverdue ? `⚠️ ${dueDateFormatted} (Atrasado)` : dueDateFormatted;

        const typeBadge = f.type === "Consignação" 
            ? `<span class="badge" style="background:#dbeafe; color:#1e40af;">🛍️ Consignação</span>` 
            : `<span class="badge" style="background:#fef3c7; color:#92400e;">👤 Fiado</span>`;

        const statusBadge = f.status === "Pago" 
            ? `<span class="badge badge-success">🟢 Pago</span>` 
            : `<span class="badge badge-warning">⏳ Pendente</span>`;

        const actionButtons = f.status === "Pendente" ? `
            <button class="btn btn-purple btn-sm" onclick="payFiado('${f.id}')" title="Marcar como Recebido e Registrar no Caixa" style="padding: 4px 8px; font-size: 11px;">Quitar ✅</button>
            <button class="btn btn-outline btn-sm" onclick="sendFiadoReminder('${f.id}')" title="Cobrar por WhatsApp" style="padding: 4px 8px; font-size: 11px; color:#25D366; border-color:#25D366;">Cobrar 📱</button>
        ` : '';

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${f.clientName}</strong></td>
            <td>${typeBadge}</td>
            <td style="font-size: 12px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.description || ''}">${f.description || '—'}</td>
            <td><strong>R$ ${f.totalVal.toFixed(2)}</strong></td>
            <td style="font-size: 12px; color: var(--color-text-muted);">${dateFormatted}</td>
            <td style="font-size: 12px; ${dueDateStyle}">${dueDateDisplay}</td>
            <td>${statusBadge}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    ${actionButtons}
                    <button class="btn btn-outline btn-sm" onclick="deleteFiado('${f.id}')" title="Excluir Registro" style="padding: 4px 8px; font-size: 11px; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3);">Excluir</button>
                </div>
            </td>
        `;
        listEl.appendChild(row);
    });
}

async function handleFiadoSubmit(e) {
    e.preventDefault();
    const type = document.getElementById("fiado-type").value;
    const clientSelect = document.getElementById("fiado-client-select");
    const clientName = document.getElementById("fiado-client-name").value.trim();
    const date = document.getElementById("fiado-date").value;
    const dueDate = document.getElementById("fiado-due-date").value || null;
    const description = document.getElementById("fiado-desc").value.trim();
    const totalVal = parseFloat(document.getElementById("fiado-total-val").value) || 0;
    const status = document.getElementById("fiado-status").value;

    const clientId = clientSelect.value || null;

    if (!clientName || !date || !description || totalVal <= 0) {
        alert("Preencha todos os campos obrigatórios e garanta que o valor total seja maior que zero.");
        return;
    }

    const newId = "f_" + Date.now();
    const payload = {
        id: newId,
        clientName,
        clientId,
        date,
        dueDate,
        description,
        totalVal,
        status,
        type
    };

    // If status is 'Pago', we also register a transaction of type 'Entrada' in the cash flow
    if (status === "Pago") {
        const transId = "t_" + Date.now() + "_f";
        const transaction = {
            id: transId,
            date: date,
            desc: `Receb. Fiado/Consig - ${clientName}`,
            type: "Entrada",
            category: "Vendas",
            val: totalVal
        };
        state.transactions.push(transaction);
        
        if (isSupabaseActive) {
            try {
                const loggedInUserId = getLoggedInUserId();
                const transPayload = {
                    id: transId,
                    date: date,
                    desc: `Receb. Fiado/Consig - ${clientName}`,
                    type: "Entrada",
                    category: "Vendas",
                    val: totalVal
                };
                if (loggedInUserId) transPayload.usuario_id = loggedInUserId;
                await supabaseClient.from('transacoes').insert([transPayload]);
            } catch(err) {
                console.error("Erro ao sincronizar transação de fiado:", err);
            }
        }
    }

    // 1. Update locally instantly
    state.fiados.push(payload);
    saveToLocalStorage();

    // 2. Clear UI instantly
    closeModal("modal-fiado");
    renderFiados();

    // 3. Background sync
    if (isSupabaseActive) {
        try {
            const loggedInUserId = getLoggedInUserId();
            const dbPayload = {
                id: newId,
                client_name: clientName,
                client_id: clientId,
                date,
                due_date: dueDate,
                description,
                total_val: totalVal,
                status,
                type
            };
            if (loggedInUserId) {
                dbPayload.usuario_id = loggedInUserId;
            }
            await supabaseClient.from('fiados').insert([dbPayload]);
            console.log("Fiado sincronizado com Supabase no plano de fundo.");
        } catch (err) {
            console.error("Erro ao sincronizar fiado:", err);
        }
    }
}

async function payFiado(id) {
    if (!confirm("Confirmar o recebimento deste pagamento? Isso registrará uma Entrada de caixa no fluxo financeiro automaticamente.")) return;

    const fiado = state.fiados.find(f => f.id === id);
    if (!fiado) return;

    fiado.status = "Pago";
    
    // Register transaction of type 'Entrada' in the cash flow
    const todayStr = new Date().toISOString().substring(0, 10);
    const transId = "t_" + Date.now() + "_f";
    const transaction = {
        id: transId,
        date: todayStr,
        desc: `Receb. Fiado/Consig - ${fiado.clientName}`,
        type: "Entrada",
        category: "Vendas",
        val: fiado.totalVal
    };
    state.transactions.push(transaction);

    // Save locally
    saveToLocalStorage();
    renderFiados();

    // Sync to Supabase in parallel
    if (isSupabaseActive) {
        try {
            const loggedInUserId = getLoggedInUserId();
            
            // 1. Update fiado status
            await supabaseClient.from('fiados').update({ status: 'Pago' }).eq('id', id);

            // 2. Add transaction
            const transPayload = {
                id: transId,
                date: todayStr,
                desc: `Receb. Fiado/Consig - ${fiado.clientName}`,
                type: "Entrada",
                category: "Vendas",
                val: fiado.totalVal
            };
            if (loggedInUserId) transPayload.usuario_id = loggedInUserId;
            await supabaseClient.from('transacoes').insert([transPayload]);
            
            console.log("Fiado quitado e transação registrada no Supabase com sucesso.");
        } catch (err) {
            console.error("Erro ao sincronizar quitação de fiado:", err);
        }
    }
}

async function deleteFiado(id) {
    if (!confirm("Excluir definitivamente este registro de fiado/consignação?")) return;

    // 1. Update locally instantly
    state.fiados = state.fiados.filter(f => f.id !== id);
    saveToLocalStorage();
    renderFiados();

    // 2. Background sync
    if (isSupabaseActive) {
        try {
            await supabaseClient.from('fiados').delete().eq('id', id);
            console.log("Fiado excluído do Supabase com sucesso.");
        } catch (err) {
            console.error("Erro ao excluir fiado:", err);
        }
    }
}

function sendFiadoReminder(id) {
    const fiado = state.fiados.find(f => f.id === id);
    if (!fiado) return;

    const formattedVal = fiado.totalVal.toFixed(2);
    const dueDateFormatted = fiado.dueDate ? new Date(fiado.dueDate).toLocaleDateString('pt-BR') : 'em breve';

    // Find client telephone if associated
    let phone = "";
    if (fiado.clientId) {
        const clientObj = state.clients.find(c => c.id === fiado.clientId);
        if (clientObj && clientObj.phone) {
            phone = clientObj.phone.replace(/\D/g, '');
        }
    }

    const greeting = "Olá! Tudo bem? 🍰";
    const body = `Passando para lembrar da sua conta em aberto de *R$ ${formattedVal}* no ConfeitaAI (${fiado.type === 'Consignação' ? 'Mercadoria Consignada' : 'Doces Fiados'}), com vencimento acordado para *${dueDateFormatted}*.\n\nDetalhes dos itens: ${fiado.description || ''}\n\nSe precisar dos dados do Pix para pagamento ou tiver dúvidas, fico à total disposição! Muito obrigada! 🙏✨`;
    
    const encodedText = encodeURIComponent(greeting + "\n\n" + body);
    
    // Construct link
    let cleanPhone = phone;
    if (cleanPhone.length > 0 && cleanPhone.length <= 11) {
        cleanPhone = "55" + cleanPhone;
    }
    
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(url, "_blank");
}

// Bind to window to allow inline onclick handlers in table markup
window.payFiado = payFiado;
window.deleteFiado = deleteFiado;
window.sendFiadoReminder = sendFiadoReminder;

// ================= CARDAPIO DIGITAL CUSTOMER STOREFRONT SIMULATOR =================

// Cart Management Functions
function addToCart(productId) {
    const item = customerCart.find(i => i.productId === productId);
    if (item) {
        item.qty++;
    } else {
        customerCart.push({ productId: productId, qty: 1 });
    }
    updateCartUI();
}

function removeFromCart(productId) {
    const idx = customerCart.findIndex(i => i.productId === productId);
    if (idx !== -1) {
        customerCart[idx].qty--;
        if (customerCart[idx].qty <= 0) {
            customerCart.splice(idx, 1);
        }
    }
    updateCartUI();
}

function openPhoneCartDrawer() {
    const drawer = document.getElementById("phone-cart-drawer");
    const backdrop = document.getElementById("phone-cart-backdrop");
    
    // Restaura exibição padrão dos componentes do carrinho
    const itemsList = document.getElementById("phone-cart-items-list");
    const summary = document.querySelector(".phone-cart-summary");
    const checkoutForm = document.querySelector(".phone-checkout-form");
    const footerActions = document.getElementById("phone-cart-footer-actions");
    const successActions = document.getElementById("phone-cart-success-actions");
    
    if (itemsList) itemsList.style.display = "";
    if (summary) summary.style.display = "";
    if (checkoutForm) checkoutForm.style.display = "";
    if (footerActions) footerActions.style.display = "";
    if (successActions) successActions.style.display = "none";
    
    const successReceipt = document.getElementById("phone-cart-success-receipt");
    if (successReceipt) successReceipt.style.display = "none";

    // Restaura o texto do botão de envio caso estivesse como "Processando..."
    const btnSubmit = document.getElementById("btn-phone-submit-order");
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Enviar Pedido no WhatsApp 💬";
    }

    if (drawer) drawer.classList.add("active");
    if (backdrop) backdrop.classList.add("active");
    
    // Prefill client session details if identified
    try {
        const sessionStr = localStorage.getItem("confeitaai_client_session");
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            const custNameInput = document.getElementById("phone-cust-name");
            const custPhoneInput = document.getElementById("phone-cust-phone");
            const custAddressInput = document.getElementById("phone-cust-address");
            const custComplementInput = document.getElementById("phone-cust-comp");
            
            if (custNameInput && !custNameInput.value) custNameInput.value = session.name || "";
            if (custPhoneInput && !custPhoneInput.value) custPhoneInput.value = session.phone || "";
            if (custAddressInput && !custAddressInput.value) custAddressInput.value = session.address || "";
            if (custComplementInput && !custComplementInput.value) custComplementInput.value = session.complement || "";
        }
    } catch(e) {
        console.error("Erro ao preencher dados de checkout:", e);
    }

    updateCartUI();
}

function closePhoneCartDrawer() {
    const drawer = document.getElementById("phone-cart-drawer");
    const backdrop = document.getElementById("phone-cart-backdrop");
    if (drawer) drawer.classList.remove("active");
    if (backdrop) backdrop.classList.remove("active");
}

// Global active category and search filter state for the mobile view
let activeCategoryFilter = "all";
let activeSearchFilter = "";
let isEditingProfile = false;


function openMenuPreview() {
    // Reset client cart and filter states
    customerCart = [];
    activeCategoryFilter = "all";
    activeSearchFilter = "";
    
    // Prefill form inputs from client session if identified
    const custName = document.getElementById("phone-cust-name");
    const custPhone = document.getElementById("phone-cust-phone");
    const custAddr = document.getElementById("phone-cust-address");
    const custComp = document.getElementById("phone-cust-comp");
    
    let session = null;
    try {
        const sessionStr = localStorage.getItem("confeitaai_client_session");
        if (sessionStr) session = JSON.parse(sessionStr);
    } catch(e) {}

    if (custName) custName.value = session ? (session.name || "") : "";
    if (custPhone) custPhone.value = session ? (session.phone || "") : "";
    if (custAddr) custAddr.value = session ? (session.address || "") : "";
    if (custComp) custComp.value = session ? (session.complement || "") : "";
    
    // Reset toggle to pickup
    const btnPickup = document.getElementById("btn-toggle-delivery-pickup");
    const btnDelivery = document.getElementById("btn-toggle-delivery-home");
    const addrGroup = document.getElementById("phone-delivery-address-group");
    const addrInput = document.getElementById("phone-cust-address");
    if (btnPickup && btnDelivery) {
        btnPickup.classList.add("active");
        btnDelivery.classList.remove("active");
        if (addrGroup) addrGroup.style.display = "none";
        if (addrInput) addrInput.required = false;
    }

    // Set phone app bar title dynamically
    const shopTitle = document.getElementById("phone-shop-logo-title");
    if (shopTitle) {
        shopTitle.innerText = "🍰 " + (state?.storeConfig?.name || "ConfeitaAI");
    }

    const footerMenu = document.getElementById("phone-footer-menu");
    const bagBar = document.getElementById("phone-bag-bar");
    const phoneBody = document.getElementById("phone-menu-body");

    // Restaura exibição padrão dos menus caso tenham sido ocultados anteriormente
    if (footerMenu) footerMenu.style.display = "";
    if (bagBar) bagBar.style.display = "";

    if (state?.storeConfig?.ownerExpired) {
        if (footerMenu) footerMenu.style.display = "none";
        if (bagBar) bagBar.style.display = "none";
        
        const phoneVal = state?.storeConfig?.phone ? state.storeConfig.phone.replace(/\D/g, '') : '';
        const whatsappMessage = encodeURIComponent("Oi, não consegui fazer o pedido pelo cardápio digital, gostaria de pedir");
        const waLink = `https://wa.me/${phoneVal || '5511999999999'}?text=${whatsappMessage}`;

        if (phoneBody) {
            phoneBody.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; text-align:center; min-height:380px; background:#fff; font-family:'Outfit', sans-serif;">
                    <div style="font-size:64px; margin-bottom:20px; animation: pulse 2s infinite;">🏪</div>
                    <h2 style="font-size:22px; font-weight:800; color:#1e293b; margin-bottom:12px; line-height:1.3;">Vitrine Temporariamente Pausada</h2>
                    <p style="font-size:14px; color:#64748b; line-height:1.6; margin-bottom:32px; max-width:280px;">
                        Esta vitrine está temporariamente pausada, mas você ainda pode fazer seu pedido diretamente pelo WhatsApp!
                    </p>
                    <a href="${waLink}" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; max-width:280px; padding:16px; background:#25D366; color:white; border-radius:16px; font-size:15px; font-weight:700; text-decoration:none; box-shadow:0 10px 20px rgba(37,211,102,0.25); transition:transform 0.2s;">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style="margin-right:4px;"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.128.552 4.195 1.6 6.015L.178 24l6.108-1.599c1.764.954 3.743 1.458 5.744 1.458 6.646 0 12.031-5.385 12.031-12.031S18.677 0 12.031 0zm0 21.84c-1.802 0-3.568-.485-5.116-1.403l-.367-.217-3.8.995.998-3.705-.238-.378C2.463 15.421 1.94 13.754 1.94 12.03 1.94 6.467 6.467 1.94 12.031 1.94c5.564 0 10.091 4.527 10.091 10.091 0 5.564-4.527 10.091-10.091 10.091zm5.534-7.553c-.303-.152-1.794-.886-2.074-.987-.28-.101-.485-.152-.688.152-.202.303-.783.987-.96 1.189-.177.202-.354.227-.657.076-1.758-.888-3.04-1.845-4.148-3.69-.115-.194-.01-.299.141-.45.136-.137.303-.354.455-.53.152-.177.202-.303.303-.505.101-.202.051-.379-.025-.53-.076-.152-.688-1.658-.94-2.269-.247-.597-.497-.516-.688-.526-.177-.01-.379-.01-.581-.01-.202 0-.53.076-.808.379-.278.303-1.061 1.036-1.061 2.527s1.087 2.932 1.238 3.134c.152.202 2.138 3.262 5.178 4.571 2.062.888 2.871.956 3.931.81.658-.09 1.794-.733 2.046-1.44.253-.707.253-1.314.177-1.44-.076-.126-.278-.202-.581-.354z"/></svg>
                        Fazer Pedido via WhatsApp
                    </a>
                    <div style="margin-top:40px; font-size:11px; color:#cbd5e1; font-weight:600; text-transform:uppercase; letter-spacing:1px;">
                        Powered by ConfeitaAI
                    </div>
                </div>
            `;
        }
        
        openModal("modal-menu-preview");
        return;
    }
    
    // Build storefront DOM
    phoneBody.innerHTML = `
        <div class="phone-shop-header-container">
            <div class="phone-shop-cover">
                <img src="${state?.storeConfig?.banner || state?.storeConfig?.logo || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=400&fit=crop'}" class="phone-shop-cover-img" alt="Capa da Loja">
                <div class="phone-shop-avatar-container">
                    <img src="${state?.storeConfig?.logo || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop'}" class="phone-shop-avatar" alt="Logo da Loja">
                </div>
            </div>
            <div class="phone-shop-info">
                <div class="phone-shop-name">
                    ${state?.storeConfig?.name || "Minha Confeitaria"}
                    ${state?.storeConfig?.loja_aberta !== false
                        ? `<span class="phone-status-badge phone-status-open"><span></span> Aberto</span>`
                        : `<span class="phone-status-badge phone-status-closed"><span></span> Fechado</span>`
                    }
                </div>
                ${state?.storeConfig?.loja_aberta === false ? `
                <div style="background: #fff5f5; border: 1px solid #ffe3e3; border-radius: 8px; padding: 10px; margin-top: 10px; font-size: 11px; color: #e53e3e; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                    <span>⚠️</span> Loja temporariamente fechada para novos pedidos.
                </div>
                ` : ''}
                <p class="phone-shop-desc">${state?.storeConfig?.desc || "Os melhores doces artesanais."}</p>
                <div class="phone-shop-meta" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px; align-items: center;">
                    <span class="phone-status-hours">🕒 ${state?.storeConfig?.hours || "Consulte nossos horários"}</span>
                    <a href="https://wa.me/${state?.storeConfig?.phone ? state.storeConfig.phone.replace(/\D/g, '') : '5511999999999'}?text=Olá!%20Estou%20no%20seu%20cardápio%20digital%20e%20gostaria%20de%20tirar%20uma%20dúvida." target="_blank" style="background:#25D366;color:white;border:none;text-decoration:none;display:flex;align-items:center;gap:4px;cursor:pointer;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:600;">
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.128.552 4.195 1.6 6.015L.178 24l6.108-1.599c1.764.954 3.743 1.458 5.744 1.458 6.646 0 12.031-5.385 12.031-12.031S18.677 0 12.031 0zm0 21.84c-1.802 0-3.568-.485-5.116-1.403l-.367-.217-3.8.995.998-3.705-.238-.378C2.463 15.421 1.94 13.754 1.94 12.03 1.94 6.467 6.467 1.94 12.031 1.94c5.564 0 10.091 4.527 10.091 10.091 0 5.564-4.527 10.091-10.091 10.091zm5.534-7.553c-.303-.152-1.794-.886-2.074-.987-.28-.101-.485-.152-.688.152-.202.303-.783.987-.96 1.189-.177.202-.354.227-.657.076-1.758-.888-3.04-1.845-4.148-3.69-.115-.194-.01-.299.141-.45.136-.137.303-.354.455-.53.152-.177.202-.303.303-.505.101-.202.051-.379-.025-.53-.076-.152-.688-1.658-.94-2.269-.247-.597-.497-.516-.688-.526-.177-.01-.379-.01-.581-.01-.202 0-.53.076-.808.379-.278.303-1.061 1.036-1.061 2.527s1.087 2.932 1.238 3.134c.152.202 2.138 3.262 5.178 4.571 2.062.888 2.871.956 3.931.81.658-.09 1.794-.733 2.046-1.44.253-.707.253-1.314.177-1.44-.076-.126-.278-.202-.581-.354z"/></svg>
                        WhatsApp
                    </a>
                </div>
            </div>
        </div>

        <div class="phone-search-wrapper">
            <span class="phone-search-icon">🔍</span>
            <input type="text" class="phone-search-input" id="phone-store-search" placeholder="Buscar no cardápio...">
        </div>

        <div class="phone-categories-container">
            <div class="phone-categories-scroll" id="phone-categories-scroll">
                <!-- Populated dynamically -->
            </div>
        </div>

        <div class="phone-store-products" id="phone-store-products" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
            <!-- Populated dynamically -->
        </div>
    `;

    // Render search listener
    const searchInput = document.getElementById("phone-store-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            activeSearchFilter = e.target.value.trim().toLowerCase();
            renderStorefrontProducts();
        });
    }

    // Render category scroll chips
    renderCategoryChips();

    // Switch to Home tab initially
    switchPhoneTab('home');

    // Reset bag bar display
    updateCartUI();

    // Bind floating bag bar click to open cart drawer
    if (bagBar) {
        // Remove existing listener if any and add clean one
        const newBagBar = bagBar.cloneNode(true);
        bagBar.parentNode.replaceChild(newBagBar, bagBar);
        newBagBar.addEventListener("click", openPhoneCartDrawer);
    }

    openModal("modal-menu-preview");
    
    // Check if tracking mode
    const urlParams = new URLSearchParams(window.location.search);
    const rastreioId = urlParams.get('rastreio');
    if (rastreioId) {
        showTrackingScreen(rastreioId);
    }
}

async function showTrackingScreen(cartId) {
    document.getElementById("phone-menu-body").style.display = "none";
    const bagBar = document.getElementById("phone-bag-bar");
    if(bagBar) bagBar.style.display = "none";
    
    document.getElementById("phone-tracking-body").style.display = "block";
    document.getElementById("track-order-id").innerText = "#" + cartId;
    
    // Default fallback if we can't find it or offline
    let status = "Em Produção"; 
    
    if (isSupabaseActive) {
        try {
            // Buscando o pedido (precisa da política RLS atualizada)
            const { data, error } = await supabaseClient.from('pedidos')
                .select('status')
                .like('notes', `%${cartId}%`)
                .limit(1);
                
            if (data && data.length > 0) {
                status = data[0].status;
            }
        } catch(e) {
            console.error("Erro ao buscar rastreio:", e);
        }
    } else {
        // Fallback local search
        const localOrder = state.orders.find(o => o.notes && o.notes.includes(cartId));
        if (localOrder) status = localOrder.status;
    }
    
    // Update tracking UI dots
    let step = 1;
    if (status === "Novo") step = 1;
    else if (status === "Em Produção") step = 2;
    else if (status === "Pronto" || status === "Em Transporte") step = 3;
    else if (status === "Concluído" || status === "Entregue") step = 4;
    
    for (let i = 1; i <= 4; i++) {
        const stepDiv = document.getElementById(`track-step-${i}`);
        if (!stepDiv) continue;
        const dot = stepDiv.querySelector(".track-dot");
        if (i <= step) {
            dot.style.background = "var(--color-primary)";
            dot.style.border = "2px solid var(--color-primary-light)";
        } else {
            dot.style.background = "#e2e8f0";
            dot.style.border = "2px solid white";
        }
    }
}

function renderCategoryChips() {
    const scrollContainer = document.getElementById("phone-categories-scroll");
    if (!scrollContainer) return;
    
    scrollContainer.innerHTML = "";
    
    // Default "Todos" chip
    const allChip = document.createElement("div");
    allChip.className = "phone-cat-chip";
    if (activeCategoryFilter === "all") allChip.classList.add("active");
    allChip.innerText = "Todos";
    allChip.setAttribute("data-cat", "all");
    allChip.addEventListener("click", () => selectCategoryChip("all"));
    scrollContainer.appendChild(allChip);
    
    let cats = state?.storeConfig?.categorias;
    if (!cats || cats.length === 0) {
        cats = [...new Set(state.products.map(p => p.category).filter(Boolean))];
    } else {
        cats = [...cats];
    }
    
    const configBuilder = getCakeBuilderConfig();
    if (configBuilder.enabled && !cats.includes("Bolos")) {
        cats.push("Bolos");
    }
    
    cats.forEach(cat => {
        const chip = document.createElement("div");
        chip.className = "phone-cat-chip";
        if (activeCategoryFilter === cat) chip.classList.add("active");
        chip.innerText = cat;
        chip.setAttribute("data-cat", cat);
        chip.addEventListener("click", () => selectCategoryChip(cat));
        scrollContainer.appendChild(chip);
    });
}

function selectCategoryChip(category) {
    activeCategoryFilter = category;
    
    // Toggle active classes on DOM chips
    const chips = document.querySelectorAll(".phone-cat-chip");
    chips.forEach(chip => {
        if (chip.getAttribute("data-cat") === category) {
            chip.classList.add("active");
        } else {
            chip.classList.remove("active");
        }
    });
    
    renderStorefrontProducts();
}

function renderStorefrontProducts() {
    const container = document.getElementById("phone-store-products");
    if (!container) return;
    
    container.innerHTML = "";
    
    // Filter products
    const isStandalone = document.body.classList.contains("standalone-storefront-mode");
    let filtered = state.products.filter(p => {
        // Enforce strict business rule: product MUST have a valid associated recipe OR be independent (no recipeId)
        // Bypass checks in live storefront since recipes are not loaded client-side
        return isStandalone || !p.recipeId || state.recipes.some(r => r.id === p.recipeId);
    });
    if (activeCategoryFilter !== "all") {
        filtered = filtered.filter(p => p.category === activeCategoryFilter);
    }
    if (activeSearchFilter) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(activeSearchFilter) || (p.desc && p.desc.toLowerCase().includes(activeSearchFilter)) || (p.description && p.description.toLowerCase().includes(activeSearchFilter)));
    }
    
    // Group products by category
    const grouped = {};
    filtered.forEach(p => {
        const cat = p.category || "Outros";
        if (!grouped[cat]) {
            grouped[cat] = [];
        }
        grouped[cat].push(p);
    });
    
    // Check if dynamic custom cake builder card should be displayed
    const configBuilder = getCakeBuilderConfig();
    const showCakeBuilder = configBuilder.enabled && 
        (activeCategoryFilter === "all" || activeCategoryFilter === "Bolos") &&
        (!activeSearchFilter || "monte seu bolo de festa".includes(activeSearchFilter) || "bolos".includes(activeSearchFilter) || "personalizar".includes(activeSearchFilter));
        
    if (showCakeBuilder) {
        if (!grouped["Bolos"]) {
            grouped["Bolos"] = [];
        }
    }
    
    if (Object.keys(grouped).length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 24px; color: #94a3b8;">
                <p>Nenhum doce encontrado. 🧁</p>
            </div>
        `;
        return;
    }
    
    // Sort category headers to match state.storeConfig.categorias if present
    let sortedCats = Object.keys(grouped);
    if (state?.storeConfig?.categorias && state.storeConfig.categorias.length > 0) {
        const orderMap = {};
        state.storeConfig.categorias.forEach((cat, index) => {
            orderMap[cat] = index;
        });
        sortedCats.sort((a, b) => {
            const indexA = orderMap[a] !== undefined ? orderMap[a] : 999;
            const indexB = orderMap[b] !== undefined ? orderMap[b] : 999;
            return indexA - indexB;
        });
    }
    
    // Render groups with category headings
    sortedCats.forEach(cat => {
        const catHeader = document.createElement("div");
        catHeader.className = "phone-category-header";
        catHeader.style.fontSize = "13px";
        catHeader.style.fontWeight = "700";
        catHeader.style.color = "var(--color-text-main)";
        catHeader.style.margin = "18px 0 8px 0";
        catHeader.style.paddingLeft = "8px";
        catHeader.style.borderLeft = "3px solid var(--color-primary)";
        catHeader.style.display = "flex";
        catHeader.style.alignItems = "center";
        catHeader.style.justifyContent = "space-between";
        
        const count = grouped[cat].length + (cat === "Bolos" && showCakeBuilder ? 1 : 0);
        catHeader.innerHTML = `
            <span>${cat}</span>
            <span style="font-size: 10px; font-weight: 500; color: #94a3b8; padding-right: 4px;">${count} ${count === 1 ? 'item' : 'itens'}</span>
        `;
        container.appendChild(catHeader);

        if (cat === "Bolos" && showCakeBuilder) {
            const minPrice = configBuilder.sizes.reduce((min, s) => {
                const p = parseFloat(s.price_simples) || 0;
                return p > 0 ? Math.min(min, p) : min;
            }, Infinity);
            const minPriceText = minPrice !== Infinity ? `A partir de R$ ${minPrice.toFixed(2)}` : "A partir de R$ 45,00";

            const bannerCard = document.createElement("div");
            bannerCard.className = "phone-product-card";
            bannerCard.style.display = "flex";
            bannerCard.style.alignItems = "center";
            bannerCard.style.justifyContent = "space-between";
            bannerCard.style.gap = "12px";
            bannerCard.style.padding = "12px";
            bannerCard.style.background = "white";
            bannerCard.style.borderRadius = "var(--border-radius-md)";
            bannerCard.style.marginBottom = "8px";
            
            bannerCard.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div class="phone-prod-photo-wrapper">
                        <img src="imagens/cake_builder_banner.jpg" alt="Monte seu Bolo" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div class="phone-prod-details" style="flex: 1;">
                        <div class="phone-prod-name" style="font-size: 13px; font-weight: 600; color: var(--color-text-main);">Monte seu Bolo de Festa 🍰</div>
                        <p style="font-size: 10px; color: #6e768e; margin: 2px 0 0 0; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                            Escolha o tamanho, recheios simples/gourmet e o topo de bolo perfeito!
                        </p>
                        <div class="phone-prod-price" style="font-size: 12px; font-weight: 700; color: var(--color-primary-hover); margin-top: 4px;">${minPriceText}</div>
                    </div>
                </div>
                <div class="phone-prod-actions" style="flex-shrink: 0;">
                    <button class="phone-btn-add" onclick="openCustomCakeBuilder()" style="background-color: var(--color-primary); color: white; border: none; font-weight: 700; border-radius: 20px; padding: 6px 12px; font-size: 11px; cursor: pointer; transition: background 0.2s; white-space: nowrap;">
                        Personalizar
                    </button>
                </div>
            `;
            container.appendChild(bannerCard);
        }
        
        grouped[cat].forEach(p => {
            const card = document.createElement("div");
            card.className = "phone-product-card";
            card.style.display = "flex";
            card.style.alignItems = "center";
            card.style.justifyContent = "space-between";
            card.style.gap = "12px";
            card.style.padding = "12px";
            card.style.background = "white";
            card.style.borderRadius = "var(--border-radius-md)";
            card.style.marginBottom = "8px";
            
            const imageElement = p.photo 
                ? `<div class="phone-prod-photo-wrapper"><img src="${p.photo}"></div>`
                : `<div class="phone-prod-emoji">${p.emoji || "🧁"}</div>`;

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    ${imageElement}
                    <div class="phone-prod-details" style="flex: 1;">
                        <div class="phone-prod-name" style="font-size: 13px; font-weight: 600; color: var(--color-text-main);">${p.name}</div>
                        <p style="font-size: 10px; color: #6e768e; margin: 2px 0 0 0; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                            ${p.desc || p.description || ''}
                        </p>
                        <div class="phone-prod-price" style="font-size: 12px; font-weight: 700; color: var(--color-primary-hover); margin-top: 4px;">R$ ${p.price.toFixed(2)}</div>
                    </div>
                </div>
                <div class="phone-prod-actions" id="prod-action-${p.id}" style="flex-shrink: 0;">
                    <!-- Filled dynamically by updateCartUI -->
                </div>
            `;
            container.appendChild(card);
        });
    });
    
    // Sync cart quantity actions
    updateCartUI();
}

function updateCartUI() {
    const isClosed = state.storeConfig && state.storeConfig.loja_aberta === false;
    if (isClosed) {
        customerCart = [];
    }

    // 1. Update product cards quantity controls in the active storefront list
    state.products.forEach(p => {
        const actionWrapper = document.getElementById(`prod-action-${p.id}`);
        if (!actionWrapper) return;
        
        if (isClosed) {
            actionWrapper.innerHTML = `
                <button class="phone-btn-add" style="opacity: 0.5; cursor: not-allowed; background: #94a3b8;" disabled>
                    Fechado
                </button>
            `;
            return;
        }
        
        const cartItem = customerCart.find(item => item.productId === p.id);
        if (cartItem && cartItem.qty > 0) {
            actionWrapper.innerHTML = `
                <div class="phone-qty-controls">
                    <button class="phone-qty-btn qty-minus" onclick="removeFromCart('${p.id}')">-</button>
                    <span class="phone-qty-val">${cartItem.qty}</span>
                    <button class="phone-qty-btn qty-plus" onclick="addToCart('${p.id}')">+</button>
                </div>
            `;
        } else {
            actionWrapper.innerHTML = `
                <button class="phone-btn-add" onclick="addToCart('${p.id}')">
                    <span>+</span> Adicionar
                </button>
            `;
        }
    });
    
    // 2. Calculate summary metrics
    let totalItems = 0;
    let totalPrice = 0;
    
    customerCart.forEach(item => {
        if (item.isCustom) {
            totalItems += item.qty;
            totalPrice += item.qty * item.customPrice;
        } else {
            const p = state.products.find(prod => prod.id === item.productId);
            if (p) {
                totalItems += item.qty;
                totalPrice += item.qty * p.price;
            }
        }
    });
    
    // 3. Update floating bag bar
    const bagBar = document.getElementById("phone-bag-bar");
    const bagQty = document.getElementById("phone-bag-qty-val");
    const bagTotal = document.getElementById("phone-bag-total-val");
    
    if (bagBar) {
        if (totalItems > 0) {
            bagBar.style.display = "flex";
            if (bagQty) bagQty.innerText = totalItems;
            if (bagTotal) bagTotal.innerText = `R$ ${totalPrice.toFixed(2)}`;
        } else {
            bagBar.style.display = "none";
        }
    }
    
    // 4. Update cart drawer items list
    const drawerList = document.getElementById("phone-cart-items-list");
    if (drawerList) {
        drawerList.innerHTML = "";
        
        if (customerCart.length === 0) {
            drawerList.innerHTML = `
                <div style="text-align: center; padding: 32px 16px; color: #94a3b8; font-size: 12px;">
                    <span style="font-size: 32px; display: block; margin-bottom: 8px;">🛍️</span>
                    Sua sacola está vazia. Adicione doces para começar!
                </div>
            `;
        } else {
            customerCart.forEach(item => {
                if (item.isCustom) {
                    const itemDiv = document.createElement("div");
                    itemDiv.className = "phone-cart-item";
                    itemDiv.innerHTML = `
                        <div class="phone-cart-item-emoji">${item.customEmoji || "🍰"}</div>
                        <div class="phone-cart-item-info">
                            <div class="phone-cart-item-name">${item.customName}</div>
                            <div class="phone-cart-item-price">R$ ${item.customPrice.toFixed(2)}</div>
                            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${item.customDetails}</div>
                        </div>
                        <div class="phone-qty-controls">
                            <button class="phone-qty-btn qty-minus" onclick="removeFromCartCustom('${item.customId}')">-</button>
                            <span class="phone-qty-val">${item.qty}</span>
                            <button class="phone-qty-btn qty-plus" onclick="addToCartCustom('${item.customId}')">+</button>
                        </div>
                    `;
                    drawerList.appendChild(itemDiv);
                } else {
                    const p = state.products.find(prod => prod.id === item.productId);
                    if (p) {
                        const itemDiv = document.createElement("div");
                        itemDiv.className = "phone-cart-item";
                        itemDiv.innerHTML = `
                            <div class="phone-cart-item-emoji">${p.emoji || "🧁"}</div>
                            <div class="phone-cart-item-info">
                                <div class="phone-cart-item-name">${p.name}</div>
                                <div class="phone-cart-item-price">R$ ${p.price.toFixed(2)}</div>
                            </div>
                            <div class="phone-qty-controls">
                                <button class="phone-qty-btn qty-minus" onclick="removeFromCart('${p.id}')">-</button>
                                <span class="phone-qty-val">${item.qty}</span>
                                <button class="phone-qty-btn qty-plus" onclick="addToCart('${p.id}')">+</button>
                            </div>
                        `;
                        drawerList.appendChild(itemDiv);
                    }
                }
            });
        }
    }
    
    // 5. Update checkout totals summary
    let deliveryFee = window.currentDeliveryFee || 0.00;
    
    const subtotalEl = document.getElementById("phone-summary-subtotal");
    const deliveryEl = document.getElementById("phone-summary-delivery");
    const totalValEl = document.getElementById("phone-summary-total-val");
    
    if (subtotalEl) subtotalEl.innerText = `R$ ${totalPrice.toFixed(2)}`;
    if (deliveryEl) deliveryEl.innerText = deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : "A calcular";
    if (totalValEl) totalValEl.innerText = `R$ ${(totalPrice + deliveryFee).toFixed(2)}`;
}

// ================= REDESIGNED CUSTOMER CARDAPIO DIGITAL STOREFRONT NAVIGATION =================

function switchPhoneTab(tabName) {
    // 1. Hide all phone body containers
    document.getElementById("phone-menu-body").style.display = "none";
    document.getElementById("phone-tracking-body").style.display = "none";
    if (document.getElementById("phone-promos-body")) document.getElementById("phone-promos-body").style.display = "none";
    if (document.getElementById("phone-orders-body")) document.getElementById("phone-orders-body").style.display = "none";
    if (document.getElementById("phone-profile-body")) document.getElementById("phone-profile-body").style.display = "none";

    // 2. Remove active class from all footer items
    const footerItems = document.querySelectorAll(".phone-footer-item");
    footerItems.forEach(item => item.classList.remove("active"));

    // 3. Show selected tab container and add active class to item
    if (tabName === 'home') {
        document.getElementById("phone-menu-body").style.display = "block";
        document.getElementById("phone-footer-item-home").classList.add("active");
        renderStorefrontProducts(); // Refilter and show all
    } else if (tabName === 'promos') {
        const promosBody = document.getElementById("phone-promos-body");
        if (promosBody) promosBody.style.display = "block";
        document.getElementById("phone-footer-item-promos").classList.add("active");
        renderStorefrontPromos();
    } else if (tabName === 'orders') {
        const ordersBody = document.getElementById("phone-orders-body");
        if (ordersBody) ordersBody.style.display = "block";
        document.getElementById("phone-footer-item-orders").classList.add("active");
        renderStorefrontOrdersHistory();
    } else if (tabName === 'profile') {
        const profileBody = document.getElementById("phone-profile-body");
        if (profileBody) profileBody.style.display = "block";
        document.getElementById("phone-footer-item-profile").classList.add("active");
        renderStorefrontProfileTab();
    }
}
window.switchPhoneTab = switchPhoneTab;

function renderCategoryDropdown() {
    const select = document.getElementById("phone-category-select");
    if (!select) return;
    
    select.innerHTML = `<option value="all">Lista de categorias</option>`;
    
    let cats = state.storeConfig.categorias;
    if (!cats || cats.length === 0) {
        cats = [...new Set(state.products.map(p => p.category).filter(Boolean))];
    }
    
    cats.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.innerText = cat;
        if (activeCategoryFilter === cat) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // Bind change listener
    select.onchange = (e) => {
        activeCategoryFilter = e.target.value;
        renderStorefrontProducts();
    };
}
window.renderCategoryDropdown = renderCategoryDropdown;

function renderStorefrontPromos() {
    const container = document.getElementById("phone-promos-body");
    if (!container) return;
    container.innerHTML = `
        <div style="font-size: 16px; font-weight: 700; color: var(--color-text-main); margin-bottom: 12px;">🏷️ Promoções & Destaques</div>
        <div id="phone-promos-list" style="display: flex; flex-direction: column; gap: 12px; padding-bottom: 80px;"></div>
    `;
    const list = container.querySelector("#phone-promos-list");
    
    const isStandalone = document.body.classList.contains("standalone-storefront-mode");
    const promoProducts = state.products.filter(p => (p.destacado || p.badgeDestaque || p.badge_destaque) && (isStandalone || !p.recipeId || state.recipes.some(r => r.id === p.recipeId)));
    
    if (promoProducts.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
                <div style="font-size: 40px; margin-bottom: 10px;">🏷️</div>
                <p style="font-size: 14px; font-weight: 500;">Nenhuma promoção ativa no momento.</p>
                <p style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Volte em breve para conferir novidades!</p>
            </div>
        `;
        return;
    }
    
    promoProducts.forEach(p => {
        list.appendChild(createProductCard(p));
    });
}
window.renderStorefrontPromos = renderStorefrontPromos;

function renderStorefrontProfileTab() {
    const container = document.getElementById("phone-profile-body");
    if (!container) return;
    
    const storeName = state?.storeConfig?.name || "Minha Confeitaria";
    const storeDesc = state?.storeConfig?.desc || "Os melhores doces artesanais, feitos com amor.";
    const storePhone = state?.storeConfig?.phone || "(11) 99999-9999";
    const storeHours = state?.storeConfig?.hours || "Segunda a Sexta, 09h às 18h";
    const storeLogo = state?.storeConfig?.logo || 'imagens/logo.webp';
    
    // Check if client is identified
    const sessionStr = localStorage.getItem("confeitaai_client_session");
    let clientCardHtml = "";
    
    if (!sessionStr || window.isEditingProfile) {
        // Form to identify (login/cadastro)
        let nameVal = "";
        let phoneVal = "";
        let addressVal = "";
        let complementVal = "";
        let birthdayVal = "";
        
        if (sessionStr) {
            try {
                const s = JSON.parse(sessionStr);
                nameVal = s.name || "";
                phoneVal = s.phone || "";
                addressVal = s.address || "";
                complementVal = s.complement || "";
                birthdayVal = s.birthday || "";
            } catch(e) {}
        }
        
        clientCardHtml = `
            <div style="background: white; border-radius: var(--border-radius-md); padding: 20px; border: 1px solid #f1f5f9; box-shadow: 0 4px 15px rgba(0,0,0,0.02); font-family: 'Outfit', sans-serif; display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
                <h4 style="font-size: 15px; font-weight: 700; color: var(--color-text-main); margin: 0; display: flex; align-items: center; gap: 8px;">
                    👤 ${window.isEditingProfile ? 'Alterar Meus Dados' : 'Entre ou Cadastre-se'}
                </h4>
                <p style="font-size: 12px; color: var(--color-text-muted); line-height: 1.4; margin: 0;">
                    Salve seus dados para agilizar seus próximos pedidos e acompanhar suas encomendas em tempo real.
                </p>
                <form id="phone-client-login-form" onsubmit="handleStorefrontClientLogin(event)" style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label style="font-size: 11px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 4px;">Nome Completo *</label>
                        <input type="text" id="phone-login-name" required value="${nameVal}" placeholder="Ex: Amanda Silva" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; outline: none; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 4px;">WhatsApp (Celular) *</label>
                        <input type="tel" id="phone-login-phone" required value="${phoneVal}" placeholder="Ex: 11988887777" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; outline: none; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 4px;">Endereço de Entrega (Rua, Número, Bairro)</label>
                        <input type="text" id="phone-login-address" value="${addressVal}" placeholder="Ex: Rua das Flores, 123 - Centro" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; outline: none; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 4px;">Complemento / Ponto de Referência</label>
                        <input type="text" id="phone-login-complement" value="${complementVal}" placeholder="Ex: Apto 42, Bloco B" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; outline: none; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 4px;">Data de Aniversário (Opcional)</label>
                        <input type="date" id="phone-login-birthday" value="${birthdayVal}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; outline: none; box-sizing: border-box;">
                    </div>
                    
                    <div style="margin-top: 4px;">
                        <a href="#" onclick="event.preventDefault(); document.getElementById('lgpd-info-box').style.display = document.getElementById('lgpd-info-box').style.display === 'none' ? 'block' : 'none';" style="font-size: 11px; color: var(--color-primary); text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                            🛡️ Por que coletamos esses dados? (LGPD)
                        </a>
                        <div id="lgpd-info-box" style="display: none; margin-top: 8px; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px; color: var(--color-text-muted); line-height: 1.4; text-align: left;">
                            Em conformidade com a LGPD (Lei Geral de Proteção de Dados), coletamos seu nome, WhatsApp, dados de endereço e data de aniversário unicamente para fins operacionais: preenchimento automático no checkout dos seus pedidos, realização de entregas seguras e eventuais campanhas de fidelidade por este ateliê. Seus dados são salvos localmente e em nosso banco de dados seguro, e não são compartilhados com terceiros.
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 6px;">
                        ${window.isEditingProfile ? `
                            <button type="button" onclick="window.isEditingProfile = false; renderStorefrontProfileTab();" class="btn btn-outline" style="flex: 1; padding: 12px; font-size: 13px; font-weight: 700; border: 1px solid #cbd5e1; background: white; border-radius: 8px; cursor: pointer; color: var(--color-text-main);">
                                Cancelar
                            </button>
                        ` : ''}
                        <button type="submit" class="btn btn-primary" style="flex: 1; padding: 12px; font-size: 13px; font-weight: 700; background: var(--color-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                            ${window.isEditingProfile ? 'Salvar Alterações ✨' : 'Cadastrar / Entrar ✨'}
                        </button>
                    </div>
                </form>
            </div>
        `;
    } else {
        // View Profile
        let clientSession = { name: "", phone: "", address: "", complement: "", birthday: "" };
        try {
            clientSession = JSON.parse(sessionStr);
        } catch(e) {}
        
        let birthdayText = "Não informado";
        if (clientSession.birthday) {
            try {
                const parts = clientSession.birthday.split('-');
                if (parts.length === 3) {
                    birthdayText = `${parts[2]}/${parts[1]}/${parts[0]}`;
                } else {
                    birthdayText = clientSession.birthday;
                }
            } catch(e) {}
        }
        
        clientCardHtml = `
            <div style="background: white; border-radius: var(--border-radius-md); padding: 20px; border: 1px solid #f1f5f9; box-shadow: 0 4px 15px rgba(0,0,0,0.02); font-family: 'Outfit', sans-serif; display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px;">
                <h4 style="font-size: 15px; font-weight: 700; color: var(--color-text-main); margin: 0; display: flex; align-items: center; gap: 8px;">
                    👤 Meu Perfil
                </h4>
                
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--color-text-main);">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px;">
                        <span style="color: var(--color-text-muted); font-weight: 500;">Nome:</span>
                        <span style="font-weight: 600;">${clientSession.name}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px;">
                        <span style="color: var(--color-text-muted); font-weight: 500;">WhatsApp:</span>
                        <span style="font-weight: 600;">${clientSession.phone}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; gap: 2px;">
                        <span style="color: var(--color-text-muted); font-weight: 500;">Endereço de Entrega:</span>
                        <span style="font-weight: 600; word-break: break-all;">${clientSession.address || "Não informado"}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; gap: 2px;">
                        <span style="color: var(--color-text-muted); font-weight: 500;">Complemento:</span>
                        <span style="font-weight: 600; word-break: break-all;">${clientSession.complement || "Não informado"}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px;">
                        <span style="color: var(--color-text-muted); font-weight: 500;">Data de Aniversário:</span>
                        <span style="font-weight: 600;">${birthdayText}</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <button onclick="window.isEditingProfile = true; renderStorefrontProfileTab();" class="btn btn-outline" style="flex: 1; padding: 10px; font-size: 12px; font-weight: 700; border: 1px solid #cbd5e1; background: white; border-radius: 8px; cursor: pointer; color: var(--color-text-main);">
                        ✏️ Alterar Dados
                    </button>
                    <button onclick="handleStorefrontClientLogout(event)" class="btn btn-outline" style="flex: 1; padding: 10px; font-size: 12px; font-weight: 700; border: 1px solid #fee2e2; background: #fef2f2; border-radius: 8px; cursor: pointer; color: var(--color-danger);">
                        🚪 Sair da Conta
                    </button>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = `
        ${clientCardHtml}
        
        <div style="display: flex; flex-direction: column; gap: 16px; background: white; border-radius: var(--border-radius-md); overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.02); border: 1px solid #f1f5f9; padding: 20px; margin-bottom: 80px; font-family: 'Outfit', sans-serif;">
            <div style="text-align: center;">
                <div style="width: 80px; height: 80px; border-radius: 50%; overflow: hidden; margin: 0 auto 12px; border: 2px solid var(--color-primary-light); box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
                    <img src="${storeLogo}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <h3 style="font-size: 17px; font-weight: 700; color: var(--color-text-main); margin-bottom: 4px;">${storeName}</h3>
                <p style="font-size: 12px; color: var(--color-text-muted); line-height: 1.4; margin: 0;">${storeDesc}</p>
            </div>
            
            <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <span style="font-size: 16px;">🕒</span>
                    <div>
                        <div style="font-size: 12px; font-weight: 700; color: var(--color-text-main);">Horário de Atendimento</div>
                        <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">${storeHours}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <span style="font-size: 16px;">💬</span>
                    <div>
                        <div style="font-size: 12px; font-weight: 700; color: var(--color-text-main);">Contato / WhatsApp</div>
                        <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">${storePhone}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <span style="font-size: 16px;">🛵</span>
                    <div>
                        <div style="font-size: 12px; font-weight: 700; color: var(--color-text-main);">Opções de Entrega</div>
                        <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">Delivery ou Retirada (combine via WhatsApp)</div>
                    </div>
                </div>
            </div>
            
            <a href="https://wa.me/${storePhone.replace(/\D/g, '')}" target="_blank" style="background:#25D366; color:white; border:none; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; padding:12px; border-radius:12px; font-size:14px; font-weight:700; margin-top: 10px; box-shadow: 0 4px 10px rgba(37, 211, 102, 0.2);">
                Enviar Mensagem no WhatsApp
            </a>
        </div>
    `;
}
window.renderStorefrontProfileTab = renderStorefrontProfileTab;

async function renderStorefrontOrdersHistory() {
    const container = document.getElementById("phone-orders-body");
    if (!container) return;
    
    // Check if client is identified
    const sessionStr = localStorage.getItem("confeitaai_client_session");
    if (!sessionStr) {
        // Render redirect guidance to profile tab
        container.innerHTML = `
            <div style="font-size: 16px; font-weight: 700; color: var(--color-text-main); margin-bottom: 12px; font-family: 'Outfit', sans-serif;">📋 Acompanhar Encomendas</div>
            <div style="background: white; border-radius: var(--border-radius-md); padding: 30px 20px; border: 1px solid #f1f5f9; box-shadow: 0 4px 15px rgba(0,0,0,0.02); text-align: center; font-family: 'Outfit', sans-serif;">
                <div style="font-size: 40px; margin-bottom: 12px;">👤</div>
                <h4 style="font-size: 15px; font-weight: 700; color: var(--color-text-main); margin-bottom: 6px;">Identificação Necessária</h4>
                <p style="font-size: 12px; color: var(--color-text-muted); line-height: 1.4; margin-bottom: 16px;">
                    Para acompanhar o status e o histórico das suas encomendas nesta confeitaria, identifique-se na aba Perfil.
                </p>
                <button onclick="switchPhoneTab('profile')" class="btn btn-primary btn-block" style="padding: 12px; font-size: 13px; font-weight: 700; background: var(--color-primary); color: white; border: none; border-radius: 8px; cursor: pointer; display: block; width: 100%;">
                    Ir para Perfil 👤
                </button>
            </div>
        `;
        return;
    }
    
    const clientSession = JSON.parse(sessionStr);
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-family: 'Outfit', sans-serif;">
            <div style="font-size: 16px; font-weight: 700; color: var(--color-text-main);">📋 Meus Pedidos</div>
            <div style="font-size: 11px; color: var(--color-text-muted);">
                Olá, <strong>${clientSession.name}</strong> (<a href="#" onclick="handleStorefrontClientLogout(event)" style="color: var(--color-danger); text-decoration: none; font-weight: 600;">Sair</a>)
            </div>
        </div>
        <div id="phone-orders-list" style="display: flex; flex-direction: column; gap: 12px; padding-bottom: 80px;">
            <div style="text-align: center; padding: 30px; color: var(--color-text-muted); font-size: 13px;">Carregando histórico... ⌛</div>
        </div>
    `;
    
    const list = container.querySelector("#phone-orders-list");
    
    // Load orders scoped by store slug
    let myOrders = [];
    const slug = state?.storeConfig?.slug || "general";
    const localKey = `confeitaai_my_orders_${slug}`;
    try {
        myOrders = JSON.parse(localStorage.getItem(localKey) || "[]");
    } catch(e) {
        console.error("Erro ao ler LocalStorage:", e);
    }
    
    // Query online DB if available
    if (isSupabaseActive && state.storeConfig.usuario_id) {
        try {
            const ownerId = state.storeConfig.usuario_id;
            
            // 1. Localizar o ID do cliente nesta loja pelo telefone da sessão
            const { data: clientData, error: clientErr } = await supabaseClient
                .from('clientes')
                .select('id')
                .eq('usuario_id', ownerId)
                .eq('phone', clientSession.phone)
                .limit(1);
                
            if (!clientErr && clientData && clientData.length > 0) {
                const clientId = clientData[0].id;
                
                // 2. Buscar todos os pedidos desse cliente
                const { data: dbOrders, error: dbOrdersErr } = await supabaseClient
                    .from('pedidos')
                    .select('*')
                    .eq('client_id', clientId);
                    
                if (!dbOrdersErr && dbOrders) {
                    const groupedDbOrders = {};
                    
                    dbOrders.forEach(o => {
                        let cartId = null;
                        if (o.notes) {
                            const match = o.notes.match(/\[CART:(\d+)\]/);
                            if (match) cartId = match[1];
                        }
                        const key = cartId || o.id;
                        
                        if (!groupedDbOrders[key]) {
                            groupedDbOrders[key] = {
                                id: key,
                                date: new Date(o.date + "T00:00:00").toLocaleDateString('pt-BR'),
                                subtotal: 0,
                                status: o.status
                            };
                        }
                        groupedDbOrders[key].subtotal += parseFloat(o.val) || 0;
                        
                        // Status mais avançado prevalece no resumo do grupo
                        const stages = ["Recebido", "Em Produção", "Pronto", "Entregue"];
                        const currentIdx = stages.indexOf(groupedDbOrders[key].status);
                        const itemIdx = stages.indexOf(o.status);
                        if (itemIdx > currentIdx) {
                            groupedDbOrders[key].status = o.status;
                        }
                    });
                    
                    // Mesclar dados do banco com LocalStorage
                    Object.values(groupedDbOrders).forEach(dbOrd => {
                        const localIdx = myOrders.findIndex(lo => lo.id === dbOrd.id);
                        if (localIdx >= 0) {
                            myOrders[localIdx].status = dbOrd.status;
                            myOrders[localIdx].subtotal = dbOrd.subtotal;
                        } else {
                            myOrders.push(dbOrd);
                        }
                    });
                    
                    // Atualizar cache
                    localStorage.setItem(localKey, JSON.stringify(myOrders));
                }
            }
        } catch(err) {
            console.error("Erro ao sincronizar histórico com Supabase:", err);
        }
    }
    
    if (myOrders.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--color-text-muted); font-family: 'Outfit', sans-serif;">
                <div style="font-size: 40px; margin-bottom: 10px;">📋</div>
                <p style="font-size: 14px; font-weight: 500;">Você ainda não fez nenhum pedido nesta confeitaria.</p>
                <p style="font-size: 12px; opacity: 0.8; margin-top: 4px; margin-bottom: 15px;">Adicione doces e faça sua encomenda no WhatsApp!</p>
                <button class="btn btn-primary btn-sm" onclick="switchPhoneTab('home')">Ver Cardápio</button>
            </div>
        `;
        return;
    }
    
    list.innerHTML = "";
    
    // Ordenar por ID/Data decrescente
    const sortedOrders = [...myOrders].sort((a, b) => b.id.localeCompare(a.id));
    
    sortedOrders.forEach(ord => {
        const card = document.createElement("div");
        card.style.background = "white";
        card.style.borderRadius = "var(--border-radius-md)";
        card.style.padding = "14px";
        card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.02)";
        card.style.border = "1px solid #f1f5f9";
        card.style.display = "flex";
        card.style.justifyContent = "space-between";
        card.style.alignItems = "center";
        card.style.cursor = "pointer";
        card.style.fontFamily = "'Outfit', sans-serif";
        
        let statusBadgeClass = "badge-purple";
        if (ord.status === "Recebido") statusBadgeClass = "badge-purple";
        else if (ord.status === "Em Produção") statusBadgeClass = "badge-warning";
        else if (ord.status === "Pronto" || ord.status === "Em Transporte") statusBadgeClass = "badge-success";
        else if (ord.status === "Entregue" || ord.status === "Concluído") statusBadgeClass = "badge-success";
        
        card.innerHTML = `
            <div>
                <div style="font-size: 13px; font-weight: 700; color: var(--color-text-main); display: flex; align-items: center; gap: 6px;">
                    Pedido #${ord.id}
                    <span class="badge ${statusBadgeClass}" style="font-size: 9px; padding: 2px 6px;">${ord.status}</span>
                </div>
                <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px;">Data: ${ord.date} &bull; Total: R$ ${parseFloat(ord.subtotal).toFixed(2)}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge badge-purple" style="font-size: 10px; padding: 4px 8px;">Acompanhar</span>
                <span style="font-size: 14px; color: var(--color-text-muted);">&rsaquo;</span>
            </div>
        `;
        
        card.addEventListener("click", () => {
            document.getElementById("phone-orders-body").style.display = "none";
            showTrackingScreen(ord.id);
        });
        
        list.appendChild(card);
    });
}
window.renderStorefrontOrdersHistory = renderStorefrontOrdersHistory;

async function handleStorefrontClientLogin(e) {
    e.preventDefault();
    const nameVal = document.getElementById("phone-login-name").value.trim();
    const phoneVal = document.getElementById("phone-login-phone").value.trim();
    const addressVal = document.getElementById("phone-login-address") ? document.getElementById("phone-login-address").value.trim() : "";
    const complementVal = document.getElementById("phone-login-complement") ? document.getElementById("phone-login-complement").value.trim() : "";
    const birthdayVal = document.getElementById("phone-login-birthday") ? document.getElementById("phone-login-birthday").value : "";
    
    if (!nameVal || !phoneVal) {
        alert("Por favor, preencha o Nome e WhatsApp.");
        return;
    }
    
    const cleanPhone = phoneVal.replace(/\D/g, "");
    
    // Save session locally
    const session = { 
        name: nameVal, 
        phone: cleanPhone, 
        address: addressVal || null, 
        complement: complementVal || null,
        birthday: birthdayVal || null
    };
    localStorage.setItem("confeitaai_client_session", JSON.stringify(session));
    
    // Check or create client on Supabase
    if (isSupabaseActive && state?.storeConfig?.usuario_id) {
        try {
            const ownerId = state.storeConfig.usuario_id;
            const { data: existing, error: getErr } = await supabaseClient
                .from('clientes')
                .select('*')
                .eq('usuario_id', ownerId)
                .eq('phone', cleanPhone)
                .limit(1);
                
            if (!getErr && existing && existing.length > 0) {
                // Update client name, address, complement, birthday
                await supabaseClient
                    .from('clientes')
                    .update({ 
                        name: nameVal, 
                        address: addressVal || null, 
                        complement: complementVal || null,
                        birthday: birthdayVal || null
                    })
                    .eq('id', existing[0].id);
            } else {
                // Insert new client
                const newId = "c_" + Date.now();
                await supabaseClient.from('clientes').insert([{
                    id: newId,
                    usuario_id: ownerId,
                    name: nameVal,
                    phone: cleanPhone,
                    address: addressVal || null,
                    complement: complementVal || null,
                    birthday: birthdayVal || null,
                    order_count: 0,
                    total_spent: 0
                }]);
            }
        } catch(err) {
            console.error("Erro ao salvar cliente no banco:", err);
        }
    }
    
    // Prefill checkout inputs
    const custNameInput = document.getElementById("phone-cust-name");
    const custPhoneInput = document.getElementById("phone-cust-phone");
    const custAddressInput = document.getElementById("phone-cust-address");
    const custComplementInput = document.getElementById("phone-cust-comp");
    
    if (custNameInput) custNameInput.value = nameVal;
    if (custPhoneInput) custPhoneInput.value = cleanPhone;
    if (custAddressInput) custAddressInput.value = addressVal;
    if (custComplementInput) custComplementInput.value = complementVal;

    window.isEditingProfile = false;
    renderStorefrontProfileTab();
    renderStorefrontOrdersHistory();
}
window.handleStorefrontClientLogin = handleStorefrontClientLogin;

function handleStorefrontClientLogout(e) {
    e.preventDefault();
    if (confirm("Tem certeza que deseja sair de seu perfil nesta loja?")) {
        localStorage.removeItem("confeitaai_client_session");
        window.isEditingProfile = false;
        
        // Clear checkout form prefill
        const custNameInput = document.getElementById("phone-cust-name");
        const custPhoneInput = document.getElementById("phone-cust-phone");
        const custAddressInput = document.getElementById("phone-cust-address");
        const custComplementInput = document.getElementById("phone-cust-comp");
        
        if (custNameInput) custNameInput.value = "";
        if (custPhoneInput) custPhoneInput.value = "";
        if (custAddressInput) custAddressInput.value = "";
        if (custComplementInput) custComplementInput.value = "";

        renderStorefrontProfileTab();
        renderStorefrontOrdersHistory();
    }
}
window.handleStorefrontClientLogout = handleStorefrontClientLogout;

// ViaCEP Integration
const cepInput = document.getElementById("phone-cust-cep");
if (cepInput) {
    cepInput.addEventListener("blur", async (e) => {
        let cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    document.getElementById("phone-cust-address").value = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                    // Simulated Freight Calculation: Random value between 5 and 15 based on the first digit of CEP
                    window.currentDeliveryFee = 5 + (parseInt(cep[0]) * 1.5);
                    updateCartUI();
                } else {
                    alert("CEP não encontrado.");
                }
            } catch(e) {
                console.error("Erro ViaCEP:", e);
            }
        }
    });
}

async function processarEncomendaDigital() {
    const nameVal = document.getElementById("phone-cust-name").value.trim();
    const phoneVal = document.getElementById("phone-cust-phone").value.trim();
    const cep = document.getElementById("phone-cust-cep").value.trim();
    const address = document.getElementById("phone-cust-address").value.trim();
    const num = document.getElementById("phone-cust-num").value.trim();
    const comp = document.getElementById("phone-cust-comp").value.trim();
    
    const btnDelivery = document.getElementById("btn-toggle-delivery-home");
    const isDelivery = btnDelivery && btnDelivery.classList.contains("active");
    
    let deliveryNotes = "";
    if (isDelivery) {
        if (!cep || !address || !num) {
            alert("Por favor, preencha o CEP e o Número para calcular a entrega.");
            return;
        }
        deliveryNotes = `Tipo: Entrega (Delivery)\nEndereço: ${address}, Nº ${num} ${comp ? '- ' + comp : ''}\nCEP: ${cep}`;
    } else {
        deliveryNotes = `Tipo: Retirada na Loja`;
        window.currentDeliveryFee = 0;
    }
    
    if (!nameVal || !phoneVal) {
        alert("Por favor, preencha seu Nome e Telefone para enviar o pedido.");
        return;
    }
    
    if (customerCart.length === 0) {
        alert("Sua sacola está vazia! Adicione itens no cardápio primeiro.");
        return;
    }
    
    const btn = document.getElementById("btn-phone-submit-order");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Processando... ⏳";
    }
    
    try {
        const ownerId = state.storeConfig.usuario_id || null;
        let clientId = "c_" + Date.now();
        
        // Calcula subtotal e linhas de itens primeiro
        let subtotal = 0;
        let itemRows = "";
        for (const item of customerCart) {
            if (item.isCustom) {
                const itemSubtotal = item.qty * item.customPrice;
                subtotal += itemSubtotal;
                itemRows += `• *${item.qty}x ${item.customName}* (${item.customEmoji || "🍰"}) - R$ ${item.customPrice.toFixed(2)} (Subtotal: R$ ${itemSubtotal.toFixed(2)})\n`;
                itemRows += `  _Opções: ${item.customDetails}_\n`;
            } else {
                const p = state.products.find(prod => prod.id === item.productId);
                if (!p) continue;
                const itemSubtotal = item.qty * p.price;
                subtotal += itemSubtotal;
                itemRows += `• *${item.qty}x ${p.name}* (${p.emoji || "🧁"}) - R$ ${p.price.toFixed(2)} (Subtotal: R$ ${itemSubtotal.toFixed(2)})\n`;
            }
        }

        const cleanPhoneTarget = phoneVal.replace(/\D/g, "");

        // 1. Criar ou buscar cliente
        if (isSupabaseActive && ownerId) {
            // Tenta localizar um cliente com o mesmo telefone para este ateliê
            const { data: existingClients } = await supabaseClient
                .from('clientes')
                .select('*')
                .eq('usuario_id', ownerId)
                .eq('phone', cleanPhoneTarget)
                .limit(1);

            if (existingClients && existingClients.length > 0) {
                clientId = existingClients[0].id;
                const newCount = (existingClients[0].order_count || 0) + 1;
                const newSpent = (parseFloat(existingClients[0].total_spent) || 0) + subtotal;
                
                await supabaseClient.from('clientes')
                    .update({ 
                        name: nameVal, 
                        order_count: newCount, 
                        total_spent: newSpent,
                        address: address ? `${address}, Nº ${num}` : (existingClients[0].address || null),
                        complement: comp || (existingClients[0].complement || null)
                    })
                    .eq('id', clientId);
            } else {
                const { data: clientData } = await supabaseClient.from('clientes').insert([{
                    id: clientId,
                    usuario_id: ownerId,
                    name: nameVal,
                    phone: cleanPhoneTarget,
                    address: address ? `${address}, Nº ${num}` : null,
                    complement: comp || null,
                    order_count: 1,
                    total_spent: subtotal
                }]).select();
                if (clientData && clientData.length > 0) clientId = clientData[0].id;
            }
        } else {
            const existingLocally = state.clients.find(c => c.phone === cleanPhoneTarget);
            if (existingLocally) {
                clientId = existingLocally.id;
                existingLocally.orderCount = (existingLocally.orderCount || 0) + 1;
                existingLocally.totalSpent = (existingLocally.totalSpent || 0) + subtotal;
            } else {
                state.clients.push({ id: clientId, name: nameVal, phone: cleanPhoneTarget, orderCount: 1, totalSpent: subtotal });
            }
        }
        
        const now = new Date();
        const cartId = String(Math.floor(10000 + Math.random() * 90000));
        window.lastOrderCartId = cartId; // To generate the tracking link
        
        // 2. Inserir Pedidos (Kanban)
        const ordersToInsert = [];
        for (const item of customerCart) {
            let p = null;
            let name = "";
            let price = 0;
            let emoji = "🧁";
            let notes = "";
            
            if (item.isCustom) {
                name = item.customName;
                price = item.customPrice;
                emoji = item.customEmoji || "🍰";
                notes = item.customDetails || "";
                
                // Encontra um bolo existente da loja ou primeiro produto como referência
                p = state.products.find(prod => prod.category === "Bolos") || state.products[0] || null;
            } else {
                p = state.products.find(prod => prod.id === item.productId);
                if (p) {
                    name = p.name;
                    price = p.price;
                    emoji = p.emoji;
                }
            }
            if (!p && !item.isCustom) continue;
            
            const productIdVal = item.isCustom ? "custom_cake" : (p ? p.id : "custom_placeholder");
            const itemSubtotal = item.qty * price;
            const orderId = "o_" + Date.now() + "_" + Math.floor(Math.random()*1000);
            
            let finalNotes = `[CART:${cartId}]\n${deliveryNotes}\n\n*Frete*: R$ ${(window.currentDeliveryFee || 0).toFixed(2)}`;
            if (item.isCustom) {
                finalNotes = `[CART:${cartId}] Bolo Personalizado: ${name}\nOpções: ${notes}\n\n${deliveryNotes}\n\n*Frete*: R$ ${(window.currentDeliveryFee || 0).toFixed(2)}`;
            }
            
            const orderPayload = {
                id: orderId,
                client_id: clientId,
                product_id: productIdVal,
                qty: item.qty,
                val: itemSubtotal,
                date: getLocalDateStr(now),
                time: now.toTimeString().split(' ')[0].substring(0, 5),
                status: "Recebido",
                notes: finalNotes
            };
            
            if (isSupabaseActive && ownerId) {
                orderPayload.usuario_id = ownerId;
            }
            ordersToInsert.push(orderPayload);
            
            // Push to local memory state using camelCase mapping
            state.orders.push({
                id: orderId,
                clientId: clientId,
                productId: productIdVal,
                qty: item.qty,
                val: itemSubtotal,
                date: getLocalDateStr(now),
                time: now.toTimeString().split(' ')[0].substring(0, 5),
                status: "Recebido",
                notes: finalNotes
            });
        }

        // 3. Batch insert orders if online
        if (isSupabaseActive && ownerId && ordersToInsert.length > 0) {
            await supabaseClient.from('pedidos').insert(ordersToInsert);
        }
        
        // 4. Batch deduct stock in parallel
        const stockPromises = customerCart.map(item => {
            if (item.isCustom) return Promise.resolve();
            const p = state.products.find(prod => prod.id === item.productId);
            if (p) {
                return deductStockForOrder({ productId: p.id, qty: item.qty });
            }
            return Promise.resolve();
        });
        await Promise.all(stockPromises);
        
        // Automatically save/login client session upon ordering
        try {
            // Retrieve existing session to keep fields like birthday
            let existingBday = null;
            try {
                const existingSess = JSON.parse(localStorage.getItem("confeitaai_client_session") || "{}");
                existingBday = existingSess.birthday || null;
            } catch(e) {}
            
            const session = { 
                name: nameVal, 
                phone: cleanPhoneTarget, 
                address: address ? `${address}, Nº ${num}` : null,
                complement: comp || null,
                birthday: existingBday
            };
            localStorage.setItem("confeitaai_client_session", JSON.stringify(session));
        } catch(e) {
            console.error("Erro ao salvar sessão do cliente:", e);
        }

        // Save order tracking ID in customer's local list scoped by store slug
        try {
            const slug = state?.storeConfig?.slug || "general";
            const localKey = `confeitaai_my_orders_${slug}`;
            let myOrders = JSON.parse(localStorage.getItem(localKey) || "[]");
            if (!myOrders.some(ord => ord.id === cartId)) {
                myOrders.push({
                    id: cartId,
                    date: new Date().toLocaleDateString('pt-BR'),
                    subtotal: subtotal + (window.currentDeliveryFee || 0),
                    status: "Recebido"
                });
                localStorage.setItem(localKey, JSON.stringify(myOrders));
            }
        } catch (e) {
            console.error("Erro ao salvar histórico de pedidos:", e);
        }
        
        saveToLocalStorage();
        
        // 4. Sucesso, Recibo e Preparação WhatsApp
        const footerActions = document.getElementById("phone-cart-footer-actions");
        const successActions = document.getElementById("phone-cart-success-actions");
        if (footerActions) footerActions.style.display = "none";
        if (successActions) successActions.style.display = "block";

        // Gera e exibe o resumo/recibo no modal
        const successReceipt = document.getElementById("phone-cart-success-receipt");
        if (successReceipt) {
            successReceipt.innerHTML = `
                <h4 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; display: flex; justify-content: space-between; font-weight: 700;">
                    <span>Resumo do Pedido</span>
                    <span style="color: var(--color-purple); font-weight: bold;">#${cartId}</span>
                </h4>
                <div style="font-size: 13px; color: #475569; line-height: 1.6;">
                    <p style="margin: 4px 0;"><strong>Cliente:</strong> ${nameVal} (${phoneVal})</p>
                    <p style="margin: 4px 0;"><strong>Entrega:</strong> ${isDelivery ? 'Delivery 🛵' : 'Retirada na Loja 🛍️'}</p>
                    ${isDelivery ? `<p style="margin: 4px 0; font-size: 12px; color: #64748b;">${address}, Nº ${num} ${comp ? '(' + comp + ')' : ''}</p>` : ''}
                    <div style="margin: 12px 0 8px 0; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                        <strong>Itens:</strong>
                        <ul style="margin: 4px 0; padding-left: 16px; font-size: 13px; list-style-type: disc;">
                            ${customerCart.map(item => {
                                let name = "";
                                let price = 0;
                                if (item.isCustom) {
                                    name = item.customName;
                                    price = item.customPrice;
                                } else {
                                    const p = state.products.find(prod => prod.id === item.productId);
                                    name = p ? p.name : "Item";
                                    price = p ? p.price : 0;
                                }
                                return `<li>${item.qty}x ${name} - R$ ${(item.qty * price).toFixed(2)}</li>`;
                            }).join('')}
                        </ul>
                    </div>
                    <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; color: #0f172a;">
                        <span>Total:</span>
                        <span>R$ ${(subtotal + (window.currentDeliveryFee || 0)).toFixed(2)}</span>
                    </div>
                </div>
            `;
            successReceipt.style.display = "block";
        }

        // Esconde itens, resumo e formulário após sucesso para exibição limpa
        const itemsList = document.getElementById("phone-cart-items-list");
        const summary = document.querySelector(".phone-cart-summary");
        const checkoutForm = document.querySelector(".phone-checkout-form");
        if (itemsList) itemsList.style.display = "none";
        if (summary) summary.style.display = "none";
        if (checkoutForm) checkoutForm.style.display = "none";

        // Limpa o carrinho na memória e reseta os cards de produtos no cardápio
        customerCart = [];
        updateCartUI();
        
        let msg = `Olá! Acabei de fazer um pedido no cardápio digital de *${state.storeConfig.name || 'ConfeitaAI'}*:\n\n`;
        msg += `*🧁 ITENS DO PEDIDO:*\n${itemRows}\n`;
        msg += `*💰 TOTAL: R$ ${(subtotal + (window.currentDeliveryFee || 0)).toFixed(2)}*\n\n`;
        msg += `*👤 CLIENTE:*\n• Nome: ${nameVal}\n• Telefone: ${phoneVal}\n\n`;
        msg += `*📦 DETALHES DA ENTREGA:*\n${deliveryNotes}\n\n`;
        msg += `Já foi enviado para o seu sistema! Aguardo a confirmação. 🙏✨`;
        
        const phoneTarget = (state.storeConfig.phone || "").replace(/\D/g, '');
        const url = `https://api.whatsapp.com/send?phone=${phoneTarget}&text=${encodeURIComponent(msg)}`;
        
        // Define o link de fallback
        const fallbackLink = document.getElementById("link-phone-whatsapp-fallback");
        if (fallbackLink) {
            fallbackLink.href = url;
        }
        
        // Auto-redirect to WhatsApp immediately upon order submission
        window.open(url, "_blank");
        
        const trackBtn = document.getElementById("btn-phone-track-order");
        if (trackBtn) {
            trackBtn.onclick = () => {
                closePhoneCartDrawer();
                showTrackingScreen(cartId);
            };
        }
        
    } catch (err) {
        console.error("Erro ao enviar pedido digital:", err);
        alert("Ocorreu um erro ao processar o pedido. Tente novamente.");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Enviar Pedido no WhatsApp 💬";
        }
    }
}

// Bind storefront functions to window so inline onclick handlers execute correctly
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.openPhoneCartDrawer = openPhoneCartDrawer;
window.closePhoneCartDrawer = closePhoneCartDrawer;
window.processarEncomendaDigital = processarEncomendaDigital;


// ================= 8. CACAU WHATSAPP SIMULATOR ENGINE (AI INTEGRATION) =================

async function handleWaSend() {
    const input = document.getElementById("wa-message-input");
    const msgText = input.value.trim();
    if (!msgText) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const userMsgId = "m_" + Date.now();
    const newUserMsg = { sender: "user", text: msgText, time: timeStr };

    // 1. Update locally instantly
    state.cacauMessages.push(newUserMsg);
    saveToLocalStorage();
    renderCacauChat();

    input.value = "";

    // 2. Background sync user message
    if (isSupabaseActive) {
        Promise.resolve(supabaseClient.from('mensagens_cacau').insert([{ id: userMsgId, sender: "user", text: msgText, time: timeStr }])).catch(err => {
            console.error("Erro ao sincronizar mensagem do usuário:", err);
        });
    }

    // 3. Show typing indicator instantly
    const chatContainer = document.getElementById("wa-messages-container");
    const typingDiv = document.createElement("div");
    typingDiv.className = "wa-msg incoming typing-bubble";
    typingDiv.innerHTML = `<div class="wa-msg-content"><em>Cacau está digitando... 🧁</em></div>`;
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    setTimeout(async () => {
        typingDiv.remove();
        await processCacauMessage(msgText, timeStr);
    }, 1500);
}

async function sendCacauCommand(commandText) {
    const input = document.getElementById("wa-message-input");
    input.value = commandText;
    await handleWaSend();
}


async function processCacauMessage(userText, timeStr) {
    let reply = "";
    const lowerText = userText.toLowerCase();
    let handledLocally = false;

    // Check for write commands to execute them locally and sync with DB
    if (lowerText.includes("cliente") && (lowerText.includes("cadastra") || lowerText.includes("adiciona"))) {
        const nameMatch = userText.match(/(?:cliente|cliente\s+)([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)*)/);
        const phoneMatch = userText.match(/(?:whatsapp|telefone|celular\s+)(\d+)/);

        if (nameMatch) {
            let clientName = nameMatch[1].trim();
            clientName = clientName.replace(/com\s*$/i, "").replace(/whatsapp\s*$/i, "").replace(/telefone\s*$/i, "").trim();
            const phoneStr = phoneMatch ? phoneMatch[1] : "119" + Math.floor(10000000 + Math.random() * 90000000);
            
            const newId = "c_" + Date.now();
            const newClient = { id: newId, name: clientName, phone: phoneStr, orderCount: 0, totalSpent: 0 };
            
            state.clients.push(newClient);
            saveToLocalStorage();
            
            if (isSupabaseActive) {
                Promise.resolve(supabaseClient.from('clientes').insert([{ id: newId, name: clientName, phone: phoneStr, order_count: 0, total_spent: 0 }])).catch(err => {
                    console.error("Erro ao cadastrar cliente por voz:", err);
                });
            }
            
            reply = `Feito! Registrei a cliente **${clientName}** na sua lista de contatos com o WhatsApp **${phoneStr}**. Ela já pode fazer encomendas! 👥✨`;
        } else {
            reply = `Gostaria de cadastrar uma cliente? Diga no formato: *"Cacau, adicione a cliente Amanda Lima com WhatsApp 11988887777"*`;
        }
        handledLocally = true;

    } else if (lowerText.includes("pedido") || lowerText.includes("encomenda")) {
        const priceMatch = userText.match(/(?:valor|preço\s+de\s+|de\s+)?(\d+)(?:\s+reais|\s+R\$)/i);
        const dateMatch = userText.match(/(\d{2}\/\d{2})/);
        
        let foundProduct = state.products[0];
        state.products.forEach(p => {
            if (lowerText.includes(p.name.toLowerCase())) {
                foundProduct = p;
            }
        });

        let foundClient = state.clients[0];
        state.clients.forEach(c => {
            if (lowerText.includes(c.name.toLowerCase())) {
                foundClient = c;
            }
        });

        const val = priceMatch ? parseFloat(priceMatch[1]) : (foundProduct ? foundProduct.price : 100);
        const dateStr = dateMatch ? `2026-${dateMatch[1].split('/')[1]}-${dateMatch[1].split('/')[0]}` : getLocalDateStr();

        const newId = "o_" + Date.now();
        const newOrder = {
            id: newId,
            clientId: foundClient.id,
            productId: foundProduct.id,
            qty: 1,
            val: val,
            date: dateStr,
            time: "16:00",
            status: "Recebido",
            notes: "Encomenda cadastrada por comando de voz via Cacau AI."
        };

        state.orders.push(newOrder);
        foundClient.orderCount++;
        foundClient.totalSpent += val;
        saveToLocalStorage();
        
        if (isSupabaseActive) {
            (async () => {
                try {
                    await supabaseClient.from('pedidos').insert([{
                        id: newId,
                        client_id: foundClient.id,
                        product_id: foundProduct.id,
                        qty: 1,
                        val: val,
                        date: dateStr,
                        time: "16:00:00",
                        status: "Recebido",
                        notes: "Encomenda cadastrada por comando de voz via Cacau AI."
                    }]);
                    await supabaseClient.from('clientes').update({
                        order_count: foundClient.orderCount,
                        total_spent: foundClient.totalSpent
                    }).eq('id', foundClient.id);
                } catch (err) {
                    console.error("Erro ao cadastrar pedido por voz:", err);
                }
            })();
        }

        reply = `Maravilha! Cadastrei a encomenda de **1x ${foundProduct.name}** para o dia **${dateMatch ? dateMatch[1] : 'próximo sábado'}** no valor de **R$ ${val.toFixed(2)}** para a cliente **${foundClient.name}**. \n\nO pedido já foi inserido no Kanban de Encomendas! 🎂🚚`;
        handledLocally = true;

    } else if (lowerText.includes("produto") && (lowerText.includes("cadastra") || lowerText.includes("cria") || lowerText.includes("adiciona"))) {
        const nameMatch = userText.match(/(?:produto|doce\s+)([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)*)/i);
        const priceMatch = userText.match(/(?:por|de|valor\s+)?(\d+)/);

        if (nameMatch) {
            let prodName = nameMatch[1].trim();
            prodName = prodName.replace(/por\s*$/i, "").replace(/de\s*$/i, "").replace(/valor\s*$/i, "").trim();
            const price = priceMatch ? parseFloat(priceMatch[1]) : 50;

            const newId = "p_" + Date.now();
            const newProduct = {
                id: newId,
                name: prodName,
                price: price,
                category: "Outros",
                desc: "Novo produto cadastrado rapidamente via Cacau AI.",
                description: "Novo produto cadastrado rapidamente via Cacau AI.",
                emoji: "🧁"
            };
            
            state.products.push(newProduct);
            saveToLocalStorage();
            
            if (isSupabaseActive) {
                Promise.resolve(supabaseClient.from('produtos').insert([{
                    id: newId,
                    name: prodName,
                    price: price,
                    category: "Outros",
                    description: "Novo produto cadastrado rapidamente via Cacau AI.",
                    emoji: "🧁"
                }])).catch(err => {
                    console.error("Erro ao cadastrar produto por voz:", err);
                });
            }

            reply = `Tudo pronto! Adicionei o produto **${prodName}** no valor de **R$ ${price.toFixed(2)}** ao seu Cardápio Digital. Já está disponível para os seus clientes verem! 🧁✨`;
        } else {
            reply = `Não consegui captar o nome do doce. Pode me pedir assim: *"Cacau, cadastra o produto Bolo de Nozes por R$ 120"*`;
        }
        handledLocally = true;
    }

    if (!handledLocally) {
        try {
            const lowIngredients = state.ingredients.filter(i => i.qty <= i.min).map(i => i.name);
            const income = state.transactions.filter(t => t.type === "Entrada").reduce((sum, t) => sum + t.val, 0);
            const expense = state.transactions.filter(t => t.type === "Saída").reduce((sum, t) => sum + t.val, 0);
            const profit = income - expense;
            const ordersCount = state.orders.length;

            const response = await fetch("/api/cacau", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: userText,
                    contextState: {
                        lowIngredients,
                        income,
                        expense,
                        profit,
                        ordersCount
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Erro na resposta do backend.");
            }

            const data = await response.json();
            reply = data.reply;

        } catch (err) {
            console.warn("Erro ao usar chat inteligente real, executando fallback local:", err);
            
            if (lowerText.includes("fatur") || lowerText.includes("lucro") || lowerText.includes("saldo") || lowerText.includes("financeiro")) {
                const income = state.transactions.filter(t => t.type === "Entrada").reduce((sum, t) => sum + t.val, 0);
                const expense = state.transactions.filter(t => t.type === "Saída").reduce((sum, t) => sum + t.val, 0);
                const profit = income - expense;
                reply = `Com certeza! Aqui está o resumo das suas finanças da confeitaria para este mês:\n\n• **Faturamento total (Entradas):** R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• **Gastos operacionais (Saídas):** R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• **Lucro Líquido:** **R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**\n\n${profit >= 0 ? "Você está operando no azul! Parabéns pelas vendas! 💵🍰" : "Atenção: seus custos superaram as vendas neste mês. Recomendo rever a Ficha Técnica das receitas!"}`;
            } else if (lowerText.includes("estoque") || lowerText.includes("ingrediente") || lowerText.includes("compras")) {
                const lows = state.ingredients.filter(i => i.qty <= i.min);
                if (lows.length === 0) {
                    reply = `Excelente notícia! Todos os seus ingredientes estão em quantidades adequadas de estoque. Nenhuma compra imediata necessária! 🧁🎉`;
                } else {
                    let listStr = "";
                    lows.forEach(l => {
                        listStr += `\n• **${l.name}**: Restam apenas ${l.qty}${l.unit} (mínimo exigido: ${l.min}${l.unit})`;
                    });
                    reply = `Atenção! Você possui **${lows.length} ingrediente(s)** em quantidade crítica no estoque:\n${listStr}\n\nDeseja que eu gere uma lista de compras formatada para você enviar ao seu fornecedor? ⚠️🛒`;
                }
            } else {
                reply = `Desculpe, a conexão com a IA da Cacau está temporariamente instável ou a chave de API não foi configurada. \n\nTente me pedir algo simples como: \n• *"Quais ingredientes estão em estoque baixo?"* \n• *"Quanto eu lucrei este mês?"* 🍰😊`;
            }
        }
    }

    const cacauMsgId = "m_" + Date.now();
    const newCacauMsg = { sender: "cacau", text: reply, time: timeStr };

    state.cacauMessages.push(newCacauMsg);
    saveToLocalStorage();
    renderCacauChat();
    renderActiveTab();

    if (isSupabaseActive) {
        Promise.resolve(supabaseClient.from('mensagens_cacau').insert([{ id: cacauMsgId, sender: "cacau", text: reply, time: timeStr }])).catch(err => {
            console.error("Erro ao sincronizar mensagem da Cacau:", err);
        });
    }
}

// ================= 15. PDF RECEIPTS =================
function gerarReciboPDF(orderId) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("Biblioteca PDF não carregada. Verifique sua conexão com a internet.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    const client = state.clients.find(c => c.id === order.clientId) || { name: "Cliente Não Identificado", phone: "" };
    let productName = "Doce Especial";
    if (order.productId === "custom_cake") {
        productName = "Bolo Personalizado";
        if (order.notes && order.notes.includes("Bolo Personalizado:")) {
            const lines = order.notes.split('\n');
            const customTitleLine = lines.find(l => l.includes("Bolo Personalizado:"));
            if (customTitleLine) {
                productName = customTitleLine.replace("Bolo Personalizado:", "").trim();
            }
        }
    } else {
        const prod = state.products.find(p => p.id === order.productId);
        productName = prod ? prod.name : "Produto Excluído";
    }
    
    const storeName = state.storeConfig.name || "Minha Confeitaria";
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(225, 29, 72); 
    doc.text(storeName, 105, 20, null, null, "center");
    
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text("RECIBO DE ENCOMENDA", 105, 30, null, null, "center");
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 35, 190, 35);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`ID do Pedido: ${order.id}`, 20, 45);
    doc.text(`Data da Encomenda: ${order.date} às ${order.time}`, 20, 52);
    
    doc.setFont("helvetica", "bold");
    doc.text("Dados do Cliente:", 20, 65);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${client.name}`, 20, 72);
    doc.text(`Telefone: ${client.phone}`, 20, 79);
    
    doc.line(20, 85, 190, 85);
    
    doc.setFont("helvetica", "bold");
    doc.text("Resumo do Pedido:", 20, 95);
    doc.setFont("helvetica", "normal");
    
    const unitPrice = order.qty > 0 ? (order.val / order.qty) : order.val;
    doc.text(`${order.qty}x ${productName} (R$ ${unitPrice.toFixed(2)} un)`, 20, 105);
    doc.text(`R$ ${order.val.toFixed(2)}`, 190, 105, null, null, "right");
    
    if (order.notes && order.notes.trim() !== "") {
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Obs: ${order.notes}`, 20, 112);
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
    }
    
    doc.line(120, 120, 190, 120);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL GERAL:", 120, 130);
    doc.text(`R$ ${order.val.toFixed(2)}`, 190, 130, null, null, "right");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Obrigado pela preferência! Volte sempre.", 105, 270, null, null, "center");
    
    doc.save(`Recibo_${client.name.replace(/\s+/g, '_')}_${order.id}.pdf`);
}
window.gerarReciboPDF = gerarReciboPDF;

// ==========================================================================
// 9. SCHEDULED ORDERS CALENDAR SYSTEM
// ==========================================================================

let calendarDate = new Date();

function handlePrevMonth() {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendario();
}

function handleNextMonth() {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendario();
}

function renderCalendario() {
    if (!state) return;
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const currentMonth = calendarDate.getMonth();
    const currentYear = calendarDate.getFullYear();

    // Update month label
    const monthLabel = document.getElementById("calendar-current-month");
    if (monthLabel) {
        monthLabel.innerText = `${monthNames[currentMonth]} ${currentYear}`;
    }

    const grid = document.getElementById("calendar-days-grid");
    if (!grid) return;
    grid.innerHTML = "";

    // First day of the month (0 = Sunday, 1 = Monday, ...)
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    // Number of days in the current month
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Previous month's trailing days
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayDiv = document.createElement("div");
        dayDiv.className = "calendar-day prev-month-day";
        dayDiv.innerText = prevMonthTotalDays - i;
        grid.appendChild(dayDiv);
    }

    // Current month's days
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement("div");
        dayDiv.className = "calendar-day";
        dayDiv.innerText = day;

        // Date string in YYYY-MM-DD format for matching orders
        const formattedMonth = String(currentMonth + 1).padStart(2, '0');
        const formattedDay = String(day).padStart(2, '0');
        const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

        // Check if it is today
        if (today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear) {
            dayDiv.classList.add("today");
        }

        // Match scheduled orders
        const dayOrders = state.orders.filter(o => o.date === dateStr);
        if (dayOrders.length > 0) {
            dayDiv.classList.add("has-orders");
            
            // Add tiny circular count indicator
            const indicator = document.createElement("span");
            indicator.className = "order-count-indicator";
            indicator.innerText = dayOrders.length;
            dayDiv.appendChild(indicator);
        }

        // Add interactive click listener
        dayDiv.addEventListener("click", () => {
            document.querySelectorAll(".calendar-day").forEach(d => d.classList.remove("selected"));
            dayDiv.classList.add("selected");
            showCalendarDayDetails(dateStr, day, currentMonth, currentYear);
        });

        grid.appendChild(dayDiv);
    }

    // Next month's leading days to fill grid completely (6 rows of 7 days = 42 cells)
    const gridElementsCount = firstDay + totalDays;
    const remainingCells = 42 - gridElementsCount;
    for (let i = 1; i <= remainingCells; i++) {
        const dayDiv = document.createElement("div");
        dayDiv.className = "calendar-day next-month-day";
        dayDiv.innerText = i;
        grid.appendChild(dayDiv);
    }
}

function showCalendarDayDetails(dateStr, day, month, year) {
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const titleEl = document.getElementById("calendar-details-title");
    if (titleEl) {
        titleEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span>Encomendas de ${day} de ${monthNames[month]}</span>
                <button class="btn btn-primary btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="window.createNewOrderWithDate('${dateStr}')">+ Novo</button>
            </div>
        `;
    }

    const listEl = document.getElementById("calendar-details-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    const dayOrders = state.orders.filter(o => o.date === dateStr);

    if (dayOrders.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma encomenda agendada para este dia! ✨</p>
                <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="window.createNewOrderWithDate('${dateStr}')">+ Novo Pedido</button>
            </div>
        `;
        return;
    }

    dayOrders.forEach(o => {
        const client = state.clients.find(c => c.id === o.clientId);
        const product = state.products.find(p => p.id === o.productId);
        
        let statusBadgeClass = "badge";
        if (o.status === "Recebido") statusBadgeClass = "badge";
        else if (o.status === "Em Produção") statusBadgeClass = "badge badge-warning";
        else if (o.status === "Pronto") statusBadgeClass = "badge badge-success";
        else if (o.status === "Entregue") statusBadgeClass = "badge badge-purple";

        let typeBadge = "";
        if (o.notes) {
            if (o.notes.includes("Entrega") || o.notes.includes("Delivery")) {
                typeBadge = `<span class="badge" style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-size: 10px; font-weight: 700;">🛵 Delivery</span>`;
            } else if (o.notes.includes("Retirada")) {
                typeBadge = `<span class="badge" style="background: #fffbeb; color: #854d0e; border: 1px solid #fef08a; font-size: 10px; font-weight: 700;">🛍️ Retirada</span>`;
            }
        }

        listEl.innerHTML += `
            <div class="calendar-detail-order-item">
                <div class="order-item-header">
                    <span class="order-item-prod">${product ? product.emoji : "🧁"} ${o.qty}x ${product ? product.name : "Doce Especial"}</span>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        ${typeBadge}
                        <span class="${statusBadgeClass}">${o.status}</span>
                    </div>
                </div>
                <div class="order-item-body">
                    <div>👤 Cliente: <strong>${client ? client.name : "Convidado"}</strong></div>
                    <div>🕒 Horário: <strong>${o.time}</strong></div>
                    ${o.notes ? `<div class="order-item-notes">📝 ${o.notes}</div>` : ""}
                </div>
                <div class="order-item-footer" style="display: flex; gap: 8px;">
                    <span class="order-item-val" style="flex: 1; align-self: center;">Total: R$ ${o.val.toFixed(2)}</span>
                    <button class="btn btn-outline btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="window.openRescheduleModal('${o.id}')">📅 Reagendar</button>
                    <button class="btn btn-outline btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="switchTab('encomendas')">Ver Encomendas</button>
                </div>
            </div>
        `;
    });
}

// ==========================================================================
// 10. PAINEL ADM LOGIC & MAINTENANCE OPERATIONS
// ==========================================================================

async function renderAdm() {
    if (!state) return;
    // Populate form fields
    const urlInput = document.getElementById("adm-sb-url");
    const keyInput = document.getElementById("adm-sb-key");
    const markupInput = document.getElementById("adm-def-markup");
    const packagingInput = document.getElementById("adm-def-packaging");
    const hourlyInput = document.getElementById("adm-def-hourly");

    if (urlInput) urlInput.value = SUPABASE_URL;
    if (keyInput) keyInput.value = SUPABASE_KEY;
    if (markupInput) markupInput.value = DEFAULT_MARKUP;
    if (packagingInput) packagingInput.value = DEFAULT_PACKAGING.toFixed(2);
    if (hourlyInput) hourlyInput.value = DEFAULT_HOURLY_RATE.toFixed(2);

    // Hide Data Maintenance for non-Super Admins
    const wipeBtn = document.getElementById("btn-adm-wipe");
    const seedBtn = document.getElementById("btn-adm-seed");
    if (wipeBtn && seedBtn) {
        const userRole = getLoggedInUserRole();
        const isSuperAdmin = userRole === "Super Admin";
        const maintenanceCard = wipeBtn.closest('.panel-card');
        if (maintenanceCard) {
            maintenanceCard.style.display = isSuperAdmin ? "block" : "none";
        }
    }

    // Update connection badge status
    const statusBadge = document.getElementById("adm-connection-status");
    if (statusBadge) {
        if (isSupabaseActive) {
            statusBadge.innerText = "🟢 Supabase Conectado";
            statusBadge.className = "badge badge-success";
        } else {
            statusBadge.innerText = "💾 Armazenamento Local";
            statusBadge.className = "badge badge-warning";
        }
    }

    // Toggle active buttons for Operational Mode
    const onlineBtn = document.getElementById("btn-mode-online");
    const offlineBtn = document.getElementById("btn-mode-offline");

    if (onlineBtn && offlineBtn) {
        if (forcedOffline) {
            offlineBtn.className = "btn btn-block active-offline";
            onlineBtn.className = "btn btn-outline btn-block";
        } else {
            onlineBtn.className = "btn btn-block active-online";
            offlineBtn.className = "btn btn-outline btn-block";
        }
    }

    // Render SVG category chart
    renderAdmCategoryChart();

    // Render collaborators table
    renderUsersTable();
}

function renderAdmCategoryChart() {
    const chartBox = document.getElementById("category-chart-box");
    const legendBox = document.getElementById("category-chart-legend");
    if (!chartBox || !legendBox) return;

    chartBox.innerHTML = "";
    legendBox.innerHTML = "";

    // Group orders by product category
    const salesByCategory = {
        "Bolos": 0,
        "Docinhos": 0,
        "Tortas": 0,
        "Cupcakes": 0,
        "Outros": 0
    };

    state.orders.forEach(o => {
        const prod = state.products.find(p => p.id === o.productId);
        const cat = prod ? prod.category : "Outros";
        const catKey = salesByCategory.hasOwnProperty(cat) ? cat : "Outros";
        salesByCategory[catKey] += o.val;
    });

    const categories = Object.keys(salesByCategory);
    const values = Object.values(salesByCategory);
    const maxVal = Math.max(...values, 100);

    const categoryColors = {
        "Bolos": "var(--color-primary)",
        "Docinhos": "var(--color-purple)",
        "Tortas": "#f97316",
        "Cupcakes": "#14b8a6",
        "Outros": "var(--color-warning)"
    };

    let svgContent = `
        <svg width="100%" height="180" viewBox="0 0 450 180" style="display: block;">
            <line x1="80" y1="10" x2="80" y2="160" stroke="#cbd5e1" stroke-width="2" />
            <line x1="80" y1="160" x2="420" y2="160" stroke="#cbd5e1" stroke-width="2" />
    `;

    categories.forEach((cat, idx) => {
        const val = salesByCategory[cat];
        const barWidth = (val / maxVal) * 300;
        const yPos = 15 + idx * 28;
        const color = categoryColors[cat];

        svgContent += `
            <text x="70" y="${yPos + 12}" fill="#6e768e" font-size="11" font-weight="600" text-anchor="end">${cat}</text>
            <rect x="80" y="${yPos}" width="${Math.max(barWidth, 4)}" height="14" fill="${color}" rx="4" style="transition: width 0.8s ease;" />
            <text x="${88 + barWidth}" y="${yPos + 11}" fill="#2d3142" font-size="10" font-weight="700">R$ ${val.toFixed(0)}</text>
        `;

        legendBox.innerHTML += `
            <div class="category-legend-item">
                <div class="category-legend-label">
                    <span class="category-legend-color" style="background-color: ${color};"></span>
                    <span>${cat}</span>
                </div>
                <span class="category-legend-value">R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
        `;
    });

    svgContent += `</svg>`;
    chartBox.innerHTML = svgContent;
}

async function handleAdmSupabaseSubmit(e) {
    e.preventDefault();
    const url = document.getElementById("adm-sb-url").value.trim();
    const key = document.getElementById("adm-sb-key").value.trim();

    SUPABASE_URL = url;
    SUPABASE_KEY = key;
    localStorage.setItem("confeitaai_supabase_url", url);
    localStorage.setItem("confeitaai_supabase_key", key);

    initSupabaseClient();
    await loadState();

    if (isSupabaseActive) {
        alert("Credenciais do Supabase validadas e conectadas com sucesso! 🌐");
    } else {
        alert("Não foi possível conectar ao Supabase com estas credenciais. O sistema continuará no modo local offline. 💾");
    }
    renderAdm();
}

async function handleAdmPricingSubmit(e) {
    e.preventDefault();
    const markup = parseFloat(document.getElementById("adm-def-markup").value) || 200;
    const packaging = parseFloat(document.getElementById("adm-def-packaging").value) || 5.0;
    const hourly = parseFloat(document.getElementById("adm-def-hourly").value) || 15.0;

    DEFAULT_MARKUP = markup;
    DEFAULT_PACKAGING = packaging;
    DEFAULT_HOURLY_RATE = hourly;

    localStorage.setItem("confeitaai_default_markup", markup);
    localStorage.setItem("confeitaai_default_packaging", packaging);
    localStorage.setItem("confeitaai_default_hourly_rate", hourly);

    alert("Parâmetros globais de precificação atualizados com sucesso! 🍰💰");
    renderAdm();
}

async function handleModeChange(offline) {
    forcedOffline = offline;
    localStorage.setItem("confeitaai_forced_offline", offline ? "true" : "false");
    
    initSupabaseClient();
    await loadState();
    
    alert(`Modo operacional alterado para: ${offline ? '💾 Armazenamento Local (Offline)' : '🌐 Supabase Cloud (Online)'}`);
    renderAdm();
}

async function handleSeedDatabaseClick() {
    const userRole = getLoggedInUserRole();
    if (userRole !== "Super Admin") {
        alert("Acesso negado. Apenas o Super Admin pode gerar dados de teste fictícios.");
        return;
    }
    
    if (confirm("Atenção: Esta ação irá reescrever todos os produtos, ingredientes, clientes, receitas e mensagens com os dados de teste padrão da Cacau. Deseja prosseguir?")) {
        showLoadingIndicator();
        try {
            if (isSupabaseActive) {
                const loggedInUserId = getLoggedInUserId();
                // Delete everything safely
                await supabaseClient.from('pedidos').delete().eq('usuario_id', loggedInUserId);
                await supabaseClient.from('transacoes').delete().eq('usuario_id', loggedInUserId);
                await supabaseClient.from('receitas').delete().eq('usuario_id', loggedInUserId);
                await supabaseClient.from('mensagens_cacau').delete().eq('usuario_id', loggedInUserId);
                await supabaseClient.from('produtos').delete().eq('usuario_id', loggedInUserId);
                await supabaseClient.from('clientes').delete().eq('usuario_id', loggedInUserId);
                await supabaseClient.from('estoque').delete().eq('usuario_id', loggedInUserId);

                // Seed tables
                await supabaseClient.from('produtos').insert(seedData.products.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    category: p.category,
                    description: p.desc,
                    emoji: p.emoji,
                    usuario_id: loggedInUserId
                })));

                await supabaseClient.from('clientes').insert(seedData.clients.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    order_count: c.orderCount,
                    total_spent: c.totalSpent,
                    usuario_id: loggedInUserId
                })));

                await supabaseClient.from('estoque').insert(seedData.ingredients.map(i => ({
                    id: i.id,
                    name: i.name,
                    qty: i.qty,
                    unit: i.unit,
                    min: i.min,
                    price: i.price,
                    usuario_id: loggedInUserId
                })));

                await supabaseClient.from('pedidos').insert(seedData.orders.map(o => ({
                    id: o.id,
                    client_id: o.clientId,
                    product_id: o.productId,
                    qty: o.qty,
                    val: o.val,
                    date: o.date,
                    time: o.time + ":00",
                    status: o.status,
                    notes: o.notes,
                    usuario_id: loggedInUserId
                })));

                await supabaseClient.from('transacoes').insert(seedData.transactions.map(t => ({
                    id: t.id,
                    date: t.date,
                    desc: t.desc,
                    type: t.type,
                    category: t.category,
                    val: t.val,
                    usuario_id: loggedInUserId
                })));

                await supabaseClient.from('receitas').insert(seedData.recipes.map(r => ({
                    id: r.id,
                    name: r.name,
                    yield: r.yield,
                    ingredients: r.ingredients,
                    margin: r.margin,
                    usuario_id: loggedInUserId
                })));

                await supabaseClient.from('mensagens_cacau').insert(seedData.cacauMessages.map(m => ({
                    id: m.id,
                    sender: m.sender,
                    text: m.text,
                    time: m.time,
                    usuario_id: loggedInUserId
                })));
            } else {
                const existingUsers = state.users; // Preserva usuários locais
                state = JSON.parse(JSON.stringify(seedData));
                state.users = existingUsers && existingUsers.length > 0 ? existingUsers : state.users;
                saveToLocalStorage();
            }

            await loadState();
            alert("Base de teste restaurada com sucesso! 🌱🍰");
        } catch (err) {
            console.error("Erro ao rodar seed:", err);
            alert("Erro ao realizar o seed. Verifique o console.");
        } finally {
            hideLoadingIndicator();
            renderAdm();
        }
    }
}

async function handleWipeDatabaseClick() {
    const userRole = getLoggedInUserRole();
    if (userRole !== "Super Admin") {
        alert("Acesso negado. Apenas o Super Admin pode apagar dados do sistema.");
        return;
    }
    
    if (confirm("⚠️ CUIDADO: Esta ação apagará permanentemente todos os registros do seu sistema de forma irreversível. Digite OK para confirmar.")) {
        if (confirm("Tem absoluta certeza disso? Seus dados serão perdidos.")) {
            showLoadingIndicator();
            try {
                if (isSupabaseActive) {
                    const loggedInUserId = getLoggedInUserId();
                    await supabaseClient.from('pedidos').delete().eq('usuario_id', loggedInUserId);
                    await supabaseClient.from('transacoes').delete().eq('usuario_id', loggedInUserId);
                    await supabaseClient.from('receitas').delete().eq('usuario_id', loggedInUserId);
                    await supabaseClient.from('mensagens_cacau').delete().eq('usuario_id', loggedInUserId);
                    await supabaseClient.from('produtos').delete().eq('usuario_id', loggedInUserId);
                    await supabaseClient.from('clientes').delete().eq('usuario_id', loggedInUserId);
                    await supabaseClient.from('estoque').delete().eq('usuario_id', loggedInUserId);
                } else {
                    const existingUsers = state.users; // Preserva usuários locais
                    state = {
                        products: [],
                        ingredients: [],
                        clients: [],
                        orders: [],
                        transactions: [],
                        recipes: [],
                        cacauMessages: []
                    };
                    saveToLocalStorage();
                }

                await loadState();
                alert("Todos os dados foram apagados com sucesso! O sistema está limpo.");
            } catch (err) {
                console.error("Erro ao apagar banco:", err);
                alert("Erro ao limpar dados na nuvem.");
            } finally {
                hideLoadingIndicator();
                renderAdm();
            }
        }
    }
}

// ==========================================================================
// 11. COLLABORATORS MANAGEMENT OPERATIONS (Super Admin CRUD)
// ==========================================================================

function renderUsersTable() {
    if (!state) return;
    const listEl = document.getElementById("users-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    const session = localStorage.getItem("confeitaai_session");
    let currentRole = '';
    try { currentRole = JSON.parse(session || '{}').role || ''; } catch(e) {}
    const isSuperAdmin = currentRole === 'Super Admin';

    // Update table header dynamically
    const tableHeader = document.querySelector("#table-users thead");
    if (tableHeader) {
        if (isSuperAdmin) {
            tableHeader.innerHTML = `
                <tr>
                    <th>Loja / Usuário</th>
                    <th>E-mail</th>
                    <th>WhatsApp</th>
                    <th>Último Acesso</th>
                    <th>Plano</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            `;
        } else {
            tableHeader.innerHTML = `
                <tr>
                    <th>Usuário</th>
                    <th>E-mail / Usuário</th>
                    <th>Função</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            `;
        }
    }

    // Sort users: last_login descending, nulls/undefined at the bottom
    const sortedUsers = [...state.users].sort((a, b) => {
        if (!a.last_login && !b.last_login) return 0;
        if (!a.last_login) return 1;
        if (!b.last_login) return -1;
        return new Date(b.last_login) - new Date(a.last_login);
    });

    sortedUsers.forEach(u => {
        // ---- SAAS OWNER VIEW ----
        if (isSuperAdmin) {
            const plan = u.plan || 'Trial';
            const expires = u.plan_expires_at ? new Date(u.plan_expires_at) : null;
            const now = new Date();
            const isExpired = plan === 'Trial' && expires && now > expires;
            const daysLeft = expires ? Math.ceil((expires - now) / (1000 * 60 * 60 * 24)) : null;

            let planBadge;
            if (plan === 'PRO') {
                planBadge = `<span class="badge badge-purple" style="font-size:11px;">👑 PRO</span>`;
            } else if (isExpired) {
                planBadge = `<span class="badge" style="background:#fee2e2;color:#ef4444;font-size:11px;">❌ Trial Expirado</span>`;
            } else {
                planBadge = `<span class="badge badge-warning" style="font-size:11px;">⏳ Trial${daysLeft !== null ? ` (${daysLeft}d)` : ''}</span>`;
            }

            const lastLogin = u.last_login ? new Date(u.last_login).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Nunca';
            const statusDot = u.status === 'Ativo' ? '🟢' : '🔴';

            // Phone formatting and link
            let phoneCell = '—';
            if (u.phone) {
                const cleanNum = u.phone.replace(/\D/g, '');
                let formattedPhone = u.phone;
                if (cleanNum.startsWith('55') && cleanNum.length >= 12) {
                    const ddd = cleanNum.substring(2, 4);
                    const prefix = cleanNum.substring(4, cleanNum.length - 4);
                    const suffix = cleanNum.substring(cleanNum.length - 4);
                    formattedPhone = `(${ddd}) ${prefix}-${suffix}`;
                } else if (cleanNum.length === 11) {
                    const ddd = cleanNum.substring(0, 2);
                    const prefix = cleanNum.substring(2, 7);
                    const suffix = cleanNum.substring(7);
                    formattedPhone = `(${ddd}) ${prefix}-${suffix}`;
                }
                phoneCell = `<a href="https://wa.me/${cleanNum}" target="_blank" style="text-decoration:none; color: #25D366; font-weight: 600;" title="Falar no WhatsApp">
                    🟢 WhatsApp (${formattedPhone})
                </a>`;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${u.name}</strong><br>
                    <span style="font-size:11px;color:#888;">@${u.username || '—'}</span>
                    ${u.username ? `<a href="/${u.username}" target="_blank" style="text-decoration:none; margin-left: 4px;" title="Ver Loja">🔗</a>` : ''}
                </td>
                <td><code style="font-size:12px;">${u.email || '—'}</code></td>
                <td style="font-size:12px;">${phoneCell}</td>
                <td style="font-size:12px;color:#64748b;">${lastLogin}</td>
                <td>${planBadge}</td>
                <td>${statusDot} ${u.status || 'Ativo'}</td>
                <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        ${plan !== 'PRO' ? `<button class="btn btn-purple btn-sm" onclick="adminUpgradeToPro('${u.id}')" style="padding:4px 8px;font-size:11px;">→ PRO</button>` : `<button class="btn btn-outline btn-sm" onclick="adminDowngradeToTrial('${u.id}')" style="padding:4px 8px;font-size:11px;color:#f59e0b;">↓ Trial</button>`}
                        <button class="btn btn-outline btn-sm" onclick="toggleUserStatus('${u.id}')" style="padding:4px 8px;font-size:11px;">${u.status === 'Ativo' ? 'Suspender' : 'Ativar'}</button>
                        ${u.role !== 'Super Admin' ? `<button class="btn btn-purple btn-sm" onclick="startImpersonation('${u.id}', '${u.name.replace(/'/g, "\\'")}')" style="padding:4px 8px;font-size:11px;background-color:#10b981;border-color:#10b981;color:white;">Acessar Painel ⚙️</button>` : ''}
                    </div>
                </td>`;
            listEl.appendChild(row);
            return;
        }

        // ---- REGULAR VIEW (não super admin) ----
        let isSelf = false;
        try {
            const sd = JSON.parse(session || '{}');
            isSelf = sd.email?.toLowerCase() === u.email?.toLowerCase();
        } catch(e) {}

        const roleBadgeClass = `role-badge role-badge-${(u.role||'').toLowerCase().replaceAll(" ", "-")}`;
        const statusBadgeClass = `role-badge ${u.status === 'Ativo' ? 'status-badge-active' : 'status-badge-inactive'}`;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${u.name}</strong> ${isSelf ? '<span style="font-size:11px;opacity:0.6;font-style:italic;">(Você)</span>' : ''}</td>
            <td><code>${u.email || '—'}</code><br><span style="font-size:10px;color:#888;">@${u.username}</span></td>
            <td><span class="${roleBadgeClass}">${u.role}</span></td>
            <td><span class="${statusBadgeClass}" style="cursor:pointer;" onclick="toggleUserStatus('${u.id}')">${u.status === 'Ativo' ? '🟢 Ativo' : '🔴 Inativo'}</span></td>
            <td>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-outline btn-sm" onclick="editUser('${u.id}')" style="padding:4px 8px;font-size:12px;">Editar</button>
                    ${!isSelf ? `<button class="btn btn-outline btn-sm" onclick="deleteUser('${u.id}')" style="padding:4px 8px;font-size:12px;color:var(--color-danger);">Excluir</button>` : ''}
                </div>
            </td>`;
        listEl.appendChild(row);
    });

    // Approximate Storage Usage and Users count update
    const usersCountEl = document.getElementById("saas-users-count");
    if (usersCountEl) {
        // Quantifica apenas as confeiteiras cadastradas (exclui o Super Admin da contagem de leads)
        const leadCount = state.users.filter(u => u.role === 'Confeiteira').length;
        usersCountEl.innerText = leadCount;
    }

    const storageEl = document.getElementById("saas-storage-usage");
    if (storageEl) {
        const stateStr = JSON.stringify(state);
        let approxBytes = Math.floor(stateStr.length * 1.1); // Add ~10% for DB overhead
        let displaySize = "";
        if (approxBytes < 1024) displaySize = approxBytes + " B";
        else if (approxBytes < 1024 * 1024) displaySize = (approxBytes / 1024).toFixed(2) + " KB";
        else displaySize = (approxBytes / (1024 * 1024)).toFixed(2) + " MB";
        
        storageEl.innerHTML = `<span style="color: var(--color-text-main); font-weight: bold;">${displaySize}</span> <span style="font-size: 14px; color: var(--color-text-muted);">/ 500 MB</span>`;
    }
}

async function adminUpgradeToPro(userId) {
    if (!confirm('Ativar Plano PRO para este usuário?')) return;
    const updates = { plan: 'PRO', plan_expires_at: null };
    const u = state.users.find(x => x.id === userId);
    if (u) { u.plan = 'PRO'; u.plan_expires_at = null; }
    renderUsersTable();
    if (isSupabaseActive) {
        await supabaseClient.from('usuarios').update(updates).eq('id', userId);
    }
}

async function adminDowngradeToTrial(userId) {
    if (!confirm('Rebaixar para Trial (7 dias) este usuário?')) return;
    const expires = new Date(); expires.setDate(expires.getDate() + 7);
    const updates = { plan: 'Trial', plan_expires_at: expires.toISOString() };
    const u = state.users.find(x => x.id === userId);
    if (u) { u.plan = 'Trial'; u.plan_expires_at = expires.toISOString(); }
    renderUsersTable();
    if (isSupabaseActive) {
        await supabaseClient.from('usuarios').update(updates).eq('id', userId);
    }
}

async function handleUserSubmit(e) {
    if (e) e.preventDefault();

    const idInput = document.getElementById("user-id");
    const nameInput = document.getElementById("user-name");
    const emailInput = document.getElementById("user-email");
    const usernameInput = document.getElementById("user-username");
    const passwordInput = document.getElementById("user-password");
    const roleInput = document.getElementById("user-role");
    const statusInput = document.getElementById("user-status");

    if (!nameInput || !usernameInput || !passwordInput || !roleInput || !statusInput) return;

    const id = idInput ? idInput.value : "";
    const name = nameInput.value.trim();
    const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
    let username = usernameInput.value.trim().toLowerCase();
    if (username.includes("@")) {
        username = username.split("@")[0];
    }
    username = username.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-_.]/g, "");
    const password = passwordInput.value;
    const role = roleInput.value;
    const status = statusInput.value;

    if (!name || !email || !username || !password) {
        alert("Por favor, preencha todos os campos obrigatórios (incluindo o e-mail)!");
        return;
    }

    // Check duplicate email
    const duplicateEmail = state.users.find(u => u.email && u.email.toLowerCase() === email && u.id !== id);
    if (duplicateEmail) {
        alert("Erro: Este e-mail já está cadastrado no sistema!");
        return;
    }

    // Check duplicate username
    const duplicateUsername = state.users.find(u => u.username.toLowerCase() === username && u.id !== id);
    if (duplicateUsername) {
        alert("Erro: Este nome de usuário já está cadastrado no sistema!");
        return;
    }

    // Safety checks for self
    const session = localStorage.getItem("confeitaai_session");
    if (session && id) {
        try {
            const sessionData = JSON.parse(session);
            const editingUser = state.users.find(u => u.id === id);
            if (editingUser && ((sessionData.email && editingUser.email && sessionData.email.toLowerCase() === editingUser.email.toLowerCase()) || sessionData.username.toLowerCase() === editingUser.username.toLowerCase())) {
                if (status !== "Ativo") {
                    alert("Segurança: Você não pode desativar seu próprio usuário!");
                    return;
                }
                if (role !== "Super Admin") {
                    alert("Segurança: Você não pode rebaixar seu próprio cargo de Super Admin!");
                    return;
                }
            }
        } catch (err) { console.error("Erro silenciado capturado:", err); }
    }

    let targetId = id;
    if (!targetId) {
        targetId = "u_" + Date.now();
    }

    const payload = {
        id: targetId,
        name,
        email,
        username,
        password,
        role,
        status
    };

    try {
        if (isSupabaseActive) {
            showLoadingIndicator();
            const { error } = await supabaseClient.from('usuarios').upsert([payload]);
            if (error) {
                throw error;
            }
        } else {
            saveLocalUser(payload, id);
        }
        
        alert("Colaborador salvo com sucesso! 🎉");
        closeModal("modal-user");
        if (idInput) idInput.value = "";
        
        await loadState();
        renderAdm();
    } catch (err) {
        console.error("Erro ao salvar usuário:", err);
        alert("Erro ao salvar colaborador. Detalhes: " + (err.message || err));
        hideLoadingIndicator();
    }
}

function saveLocalUser(payload, originalId) {
    if (!originalId) {
        state.users.push(payload);
    } else {
        const idx = state.users.findIndex(u => u.id === originalId);
        if (idx !== -1) {
            state.users[idx] = payload;
        }
    }
    saveToLocalStorage();
}

function editUser(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) {
        alert("Colaborador não encontrado!");
        return;
    }

    const idInput = document.getElementById("user-id");
    const nameInput = document.getElementById("user-name");
    const emailInput = document.getElementById("user-email");
    const usernameInput = document.getElementById("user-username");
    const passwordInput = document.getElementById("user-password");
    const roleInput = document.getElementById("user-role");
    const statusInput = document.getElementById("user-status");

    if (idInput) idInput.value = user.id;
    if (nameInput) nameInput.value = user.name;
    if (emailInput) emailInput.value = user.email || "";
    if (usernameInput) usernameInput.value = user.username;
    if (passwordInput) passwordInput.value = user.password;
    if (roleInput) roleInput.value = user.role;
    if (statusInput) statusInput.value = user.status;

    const modalTitle = document.getElementById("user-modal-title");
    if (modalTitle) modalTitle.innerText = "Editar Colaborador";

    openModal("modal-user");
}

async function deleteUser(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) {
        alert("Colaborador não encontrado!");
        return;
    }

    // Safety checks
    const session = localStorage.getItem("confeitaai_session");
    if (session) {
        try {
            const sessionData = JSON.parse(session);
            if ((sessionData.email && user.email && sessionData.email.toLowerCase() === user.email.toLowerCase()) || sessionData.username.toLowerCase() === user.username.toLowerCase()) {
                alert("Segurança: Você não pode excluir seu próprio usuário em sessão!");
                return;
            }
        } catch (e) { console.error("Erro silenciado capturado:", e); }
    }

    if (!confirm(`Tem certeza absoluta de que deseja excluir permanentemente o colaborador "${user.name}"?`)) {
        return;
    }

    try {
        if (isSupabaseActive) {
            showLoadingIndicator();
            const { error } = await supabaseClient.from('usuarios').delete().eq('id', id);
            if (error) throw error;
        } else {
            state.users = state.users.filter(u => u.id !== id);
            saveToLocalStorage();
        }

        alert("Colaborador removido com sucesso!");
        await loadState();
        renderAdm();
    } catch (err) {
        console.error("Erro ao excluir usuário:", err);
        alert("Erro ao excluir colaborador da nuvem. Detalhes: " + (err.message || err));
        hideLoadingIndicator();
    }
}

async function toggleUserStatus(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) {
        alert("Colaborador não encontrado!");
        return;
    }

    // Safety checks
    const session = localStorage.getItem("confeitaai_session");
    if (session) {
        try {
            const sessionData = JSON.parse(session);
            if ((sessionData.email && user.email && sessionData.email.toLowerCase() === user.email.toLowerCase()) || sessionData.username.toLowerCase() === user.username.toLowerCase()) {
                alert("Segurança: Você não pode desativar seu próprio usuário em sessão!");
                return;
            }
        } catch (e) { console.error("Erro silenciado capturado:", e); }
    }

    const newStatus = user.status === "Ativo" ? "Inativo" : "Ativo";
    const actionWord = newStatus === "Ativo" ? "ativar" : "desativar";

    if (!confirm(`Deseja realmente ${actionWord} o colaborador "${user.name}"?`)) {
        return;
    }

    const payload = { ...user, status: newStatus };

    try {
        if (isSupabaseActive) {
            showLoadingIndicator();
            const { error } = await supabaseClient.from('usuarios').upsert([payload]);
            if (error) throw error;
        } else {
            const idx = state.users.findIndex(u => u.id === id);
            if (idx !== -1) {
                state.users[idx] = payload;
            }
            saveToLocalStorage();
        }

        alert(`Colaborador ${newStatus === "Ativo" ? "ativado" : "desativado"} com sucesso!`);
        await loadState();
        renderAdm();
    } catch (err) {
        console.error("Erro ao alterar status:", err);
        alert("Erro ao alterar status na nuvem. Detalhes: " + (err.message || err));
        hideLoadingIndicator();
    }
}

// Bind to window to allow inline onclick handlers in table markup
window.editUser = editUser;
window.deleteUser = deleteUser;
window.toggleUserStatus = toggleUserStatus;

// ================= 9. CARDAPIO DIGITAL CORE UTILITIES =================

function parseHours(hoursStr) {
    const defaultVal = {
        days: ["Seg", "Ter", "Qua", "Qui", "Sex"],
        timeStart: "09:00",
        timeEnd: "18:00"
    };
    
    if (!hoursStr || typeof hoursStr !== 'string') return defaultVal;
    
    if (hoursStr.toLowerCase().includes("combinar") || hoursStr.toLowerCase().includes("consulte")) {
        return {
            days: [],
            timeStart: "",
            timeEnd: ""
        };
    }
    
    const parts = hoursStr.split(",");
    if (parts.length < 2) return defaultVal;
    
    const daysPart = parts[0].trim();
    let days = [];
    
    if (daysPart === "Seg a Sex") {
        days = ["Seg", "Ter", "Qua", "Qui", "Sex"];
    } else if (daysPart === "Seg a Dom") {
        days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    } else if (daysPart === "Seg a Sáb") {
        days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    } else {
        const lastPart = parts[parts.length - 1].trim();
        const dayParts = parts.slice(0, parts.length - 1).map(d => d.trim());
        
        dayParts.forEach(dp => {
            if (dp === "Seg a Sex") days.push("Seg", "Ter", "Qua", "Qui", "Sex");
            else if (dp === "Seg a Dom") days.push("Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom");
            else if (dp === "Seg a Sáb") days.push("Seg", "Ter", "Qua", "Qui", "Sex", "Sáb");
            else if (["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].includes(dp)) {
                days.push(dp);
            }
        });
    }
    
    let timeStart = "09:00";
    let timeEnd = "18:00";
    
    const timeMatch = hoursStr.match(/(\d{2}:\d{2})\s*(?:às|as|to|-)\s*(\d{2}:\d{2})/i);
    if (timeMatch) {
        timeStart = timeMatch[1];
        timeEnd = timeMatch[2];
    }
    
    return { days, timeStart, timeEnd };
}

function populateStoreForm() {
    const nameEl = document.getElementById("store-name");
    const slugEl = document.getElementById("store-slug");
    const phoneEl = document.getElementById("store-phone");
    const logoEl = document.getElementById("store-logo");
    const bannerEl = document.getElementById("store-banner");
    const descEl = document.getElementById("store-desc");
    const themeColorEl = document.getElementById("store-theme-color");
    
    if (nameEl) nameEl.value = state.storeConfig.name || "";
    if (slugEl) slugEl.value = state.storeConfig.slug || "";
    if (phoneEl) phoneEl.value = state.storeConfig.phone || "";
    if (logoEl) {
        logoEl.value = state.storeConfig.logo || "";
        logoEl.dispatchEvent(new Event('input'));
    }
    if (bannerEl) {
        bannerEl.value = state.storeConfig.banner || "";
        bannerEl.dispatchEvent(new Event('input'));
    }
    if (descEl) descEl.value = state.storeConfig.desc || "";
    if (themeColorEl) {
        themeColorEl.value = state.storeConfig.cor_tema || "#ff7eb9";
    }
    
    const openToggleEl = document.getElementById("store-open-toggle");
    if (openToggleEl) {
        openToggleEl.checked = state.storeConfig.loja_aberta !== false;
    }
    
    applyStorefrontThemeColor(state.storeConfig.cor_tema);
    updateQuickToggleUI();
    
    // Parse and set the days buttons and times inputs
    const parsedHours = parseHours(state.storeConfig.hours || "");
    
    // Set days buttons active state
    const dayButtons = document.querySelectorAll(".btn-day-toggle");
    dayButtons.forEach(btn => {
        const day = btn.getAttribute("data-day");
        if (parsedHours.days.includes(day)) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    
    // Set time inputs
    const timeStartEl = document.getElementById("store-time-start");
    const timeEndEl = document.getElementById("store-time-end");
    if (timeStartEl) timeStartEl.value = parsedHours.timeStart || "09:00";
    if (timeEndEl) timeEndEl.value = parsedHours.timeEnd || "18:00";
    
    updateStoreShowcase();

    // Dynamic Custom Cake Builder Form Populating
    const enableCakeBuilderEl = document.getElementById("store-enable-cake-builder");
    const configAreaEl = document.getElementById("cake-builder-config-area");
    const maxFillingsEl = document.getElementById("store-cake-max-fillings");
    const fillingsSimplesEl = document.getElementById("store-cake-fillings-simples");
    const fillingsFrutasEl = document.getElementById("store-cake-fillings-frutas");
    const fillingsGourmetEl = document.getElementById("store-cake-fillings-gourmet");
    
    const builderConfig = getCakeBuilderConfig();
    
    if (enableCakeBuilderEl) {
        enableCakeBuilderEl.checked = builderConfig.enabled;
        if (configAreaEl) {
            configAreaEl.style.display = builderConfig.enabled ? "block" : "none";
        }
    }
    
    if (maxFillingsEl) maxFillingsEl.value = builderConfig.max_fillings;
    
    if (fillingsSimplesEl) fillingsSimplesEl.value = (builderConfig.fillings.Simples || []).join(", ");
    if (fillingsFrutasEl) fillingsFrutasEl.value = (builderConfig.fillings.Frutas || []).join(", ");
    if (fillingsGourmetEl) fillingsGourmetEl.value = (builderConfig.fillings.Gourmet || []).join(", ");
    
    renderBuilderConfigSizesTable(builderConfig.sizes);
}

function renderBuilderConfigSizesTable(sizes) {
    const tbody = document.getElementById("builder-config-sizes-table-body");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    sizes.forEach((size) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        
        tr.innerHTML = `
            <td style="padding: 8px 10px;">
                <input type="text" class="config-size-name" value="${size.name || ''}" placeholder="Ex: 15 cm" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;" required>
            </td>
            <td style="padding: 8px 10px;">
                <input type="text" class="config-size-slices" value="${size.slices || ''}" placeholder="Ex: 10 a 12 fatias" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;">
            </td>
            <td style="padding: 8px 10px;">
                <input type="number" class="config-size-simples" step="0.01" value="${size.price_simples !== undefined ? parseFloat(size.price_simples).toFixed(2) : '0.00'}" style="width: 75px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; font-weight: bold; color: var(--color-purple);">
            </td>
            <td style="padding: 8px 10px;">
                <input type="number" class="config-size-frutas" step="0.01" value="${size.price_frutas !== undefined ? parseFloat(size.price_frutas).toFixed(2) : '0.00'}" style="width: 75px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; font-weight: bold; color: var(--color-purple);">
            </td>
            <td style="padding: 8px 10px;">
                <input type="number" class="config-size-gourmet" step="0.01" value="${size.price_gourmet !== undefined ? parseFloat(size.price_gourmet).toFixed(2) : '0.00'}" style="width: 75px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; font-weight: bold; color: var(--color-purple);">
            </td>
            <td style="padding: 8px 10px;">
                <input type="number" class="config-size-topper-simple" step="0.01" value="${size.topper_simple !== undefined ? parseFloat(size.topper_simple).toFixed(2) : '15.00'}" style="width: 70px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;">
            </td>
            <td style="padding: 8px 10px;">
                <input type="number" class="config-size-topper-custom" step="0.01" value="${size.topper_custom !== undefined ? parseFloat(size.topper_custom).toFixed(2) : '25.00'}" style="width: 70px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;">
            </td>
            <td style="padding: 8px 10px; text-align: center;">
                <button type="button" class="btn btn-text" onclick="removeBuilderConfigRow(this)" style="color: var(--color-danger); font-size: 16px; padding: 4px; cursor: pointer; border: none; background: none;">&times;</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.removeBuilderConfigRow = function(btn) {
    const row = btn.closest("tr");
    if (row) {
        row.remove();
    }
};

window.addBuilderConfigRow = function() {
    const tbody = document.getElementById("builder-config-sizes-table-body");
    if (!tbody) return;
    
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f1f5f9";
    
    tr.innerHTML = `
        <td style="padding: 8px 10px;">
            <input type="text" class="config-size-name" value="" placeholder="Ex: 15 cm" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;" required>
        </td>
        <td style="padding: 8px 10px;">
            <input type="text" class="config-size-slices" value="" placeholder="Ex: 10 a 12 fatias" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;">
        </td>
        <td style="padding: 8px 10px;">
            <input type="number" class="config-size-simples" step="0.01" value="0.00" style="width: 75px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; font-weight: bold; color: var(--color-purple);">
        </td>
        <td style="padding: 8px 10px;">
            <input type="number" class="config-size-frutas" step="0.01" value="0.00" style="width: 75px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; font-weight: bold; color: var(--color-purple);">
        </td>
        <td style="padding: 8px 10px;">
            <input type="number" class="config-size-gourmet" step="0.01" value="0.00" style="width: 75px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; font-weight: bold; color: var(--color-purple);">
        </td>
        <td style="padding: 8px 10px;">
            <input type="number" class="config-size-topper-simple" step="0.01" value="15.00" style="width: 70px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;">
        </td>
        <td style="padding: 8px 10px;">
            <input type="number" class="config-size-topper-custom" step="0.01" value="25.00" style="width: 70px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;">
        </td>
        <td style="padding: 8px 10px; text-align: center;">
            <button type="button" class="btn btn-text" onclick="removeBuilderConfigRow(this)" style="color: var(--color-danger); font-size: 16px; padding: 4px; cursor: pointer; border: none; background: none;">&times;</button>
        </td>
    `;
    tbody.appendChild(tr);
};

function updateGeneratedStoreLink() {
    const slugEl = document.getElementById("store-slug");
    const urlEl = document.getElementById("store-showcase-url");
    if (slugEl && urlEl) {
        let val = slugEl.value.trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9-_.]/g, "");
        const origin = window.location.origin;
        urlEl.innerText = `${origin}/${val || "sua-loja"}`;
    }
}

function updateStoreShowcase() {
    const nameEl = document.getElementById("showcase-name");
    const hoursEl = document.getElementById("showcase-hours");
    const descEl = document.getElementById("showcase-desc");
    const urlEl = document.getElementById("store-showcase-url");
    const logoImgEl = document.getElementById("showcase-logo-img");
    const logoPlaceholderEl = document.getElementById("showcase-logo-placeholder");
    const coverEl = document.querySelector(".store-showcase-cover");
    
    if (nameEl) nameEl.innerText = state.storeConfig.name || "Sua Loja";
    if (hoursEl) hoursEl.innerText = state.storeConfig.hours || "Aberto de segunda a sexta";
    if (descEl) descEl.innerText = state.storeConfig.desc || "A sua loja de doces preferida.";
    
    if (coverEl && state.storeConfig.banner) {
        coverEl.style.backgroundImage = `url('${state.storeConfig.banner}')`;
        coverEl.style.backgroundSize = "cover";
        coverEl.style.backgroundPosition = "center";
    }
    
    if (urlEl) {
        const slug = state.storeConfig.slug || "sua-loja";
        const origin = window.location.origin;
        urlEl.innerText = `${origin}/${slug}`;
    }
    
    if (logoImgEl && logoPlaceholderEl) {
        if (state.storeConfig.logo && (state.storeConfig.logo.startsWith("http") || state.storeConfig.logo.startsWith("data:image"))) {
            logoImgEl.src = state.storeConfig.logo;
            logoImgEl.style.display = "block";
            logoPlaceholderEl.style.display = "none";
        } else {
            logoImgEl.style.display = "none";
            logoPlaceholderEl.style.display = "block";
        }
    }
}

// Bind storefront cart functions to window for onclick handlers
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.openPhoneCartDrawer = openPhoneCartDrawer;
window.closePhoneCartDrawer = closePhoneCartDrawer;

window.populateStoreForm = populateStoreForm;
window.updateGeneratedStoreLink = updateGeneratedStoreLink;
window.updateStoreShowcase = updateStoreShowcase;

// ================= 11. OPTIONS 3, 4, 5 EXTENDED UTILITIES =================

function applyTheme(theme) {
    document.body.classList.remove("theme-dark", "theme-rosegold");
    if (theme === "dark") {
        theme = "warm-cream";
        localStorage.setItem("confeitaai_theme", "warm-cream");
        const themeSelector = document.getElementById("theme-selector");
        if (themeSelector) themeSelector.value = "warm-cream";
    }
    if (theme === "rosegold") {
        document.body.classList.add("theme-rosegold");
    }
}
window.applyTheme = applyTheme;

function createNewOrderWithDate(dateStr) {
    const form = document.getElementById("form-order");
    if (form) form.reset();
    
    const idField = document.getElementById("ord-id");
    if (idField) idField.value = "";
    
    const dateField = document.getElementById("ord-date");
    if (dateField) {
        dateField.value = dateStr;
    }
    
    openModal("modal-order");
}
window.createNewOrderWithDate = createNewOrderWithDate;

function openRescheduleModal(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        alert("Encomenda não encontrada!");
        return;
    }
    
    const idField = document.getElementById("reschedule-order-id");
    if (idField) idField.value = orderId;
    
    const dateField = document.getElementById("reschedule-date");
    if (dateField) dateField.value = order.date || "";
    
    const timeField = document.getElementById("reschedule-time");
    if (timeField) timeField.value = order.time || "";
    
    openModal("modal-reschedule");
}
window.openRescheduleModal = openRescheduleModal;

function exportTransactionsToCSV() {
    if (!state.transactions || state.transactions.length === 0) {
        alert("Nenhuma transação disponível para exportação!");
        return;
    }

    const headers = ["ID", "Data", "Descrição", "Tipo", "Categoria", "Valor (R$)"];
    const rows = state.transactions.map(t => [
        t.id,
        t.date,
        t.desc,
        t.type,
        t.category,
        t.val.toFixed(2).replace(".", ",")
    ]);

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += headers.join(";") + "\n";
    rows.forEach(row => {
        const rowStr = row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";");
        csvContent += rowStr + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `confeitaai_fluxo_caixa_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
window.exportTransactionsToCSV = exportTransactionsToCSV;

function printFinancialReport() {
    let printContainer = document.getElementById("print-report-container");
    if (!printContainer) {
        printContainer = document.createElement("div");
        printContainer.id = "print-report-container";
        document.body.appendChild(printContainer);
    }

    const income = state.transactions.filter(t => t.type === "Entrada").reduce((sum, t) => sum + t.val, 0);
    const expense = state.transactions.filter(t => t.type !== "Entrada").reduce((sum, t) => sum + t.val, 0);
    const profit = income - expense;

    // Category breakdown
    const categoryTotals = {};
    state.transactions.forEach(t => {
        const cat = t.category || "Outros";
        if (!categoryTotals[cat]) {
            categoryTotals[cat] = { income: 0, expense: 0 };
        }
        if (t.type === "Entrada") {
            categoryTotals[cat].income += t.val;
        } else {
            categoryTotals[cat].expense += t.val;
        }
    });

    let categoryRows = "";
    Object.keys(categoryTotals).forEach(cat => {
        const tot = categoryTotals[cat];
        categoryRows += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${cat}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #10b981;">R$ ${tot.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #ef4444;">R$ ${tot.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
        `;
    });

    // Transaction rows sorted by date desc
    const sortedTrans = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    let transactionRows = "";
    sortedTrans.forEach(t => {
        transactionRows += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${t.date.split("-").reverse().join("/")}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${t.desc}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${t.category}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: ${t.type === 'Entrada' ? '#10b981' : '#ef4444'};">
                    ${t.type === 'Entrada' ? '+' : '-'} R$ ${t.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
            </tr>
        `;
    });

    const storeName = state.storeConfig.name || "ConfeitaAI";
    const dateFormatted = new Date().toLocaleDateString('pt-BR');

    printContainer.innerHTML = `
        <div style="padding: 40px; font-family: 'Outfit', 'Inter', sans-serif; color: #333; max-width: 800px; margin: 0 auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
                <div>
                    <h1 style="font-size: 28px; margin: 0; color: #db8876; font-weight: 700;">${storeName}</h1>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Relatório de Fluxo de Caixa Realizado</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; font-size: 14px; color: #666;">Data de Geração: ${dateFormatted}</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">Gerado por ConfeitaAI</p>
                </div>
            </div>

            <!-- Financial Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px;">
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background-color: #f9f9f9; text-align: center;">
                    <span style="font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase;">Total de Entradas</span>
                    <h3 style="font-size: 20px; margin: 10px 0 0 0; color: #10b981;">R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background-color: #f9f9f9; text-align: center;">
                    <span style="font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase;">Total de Saídas</span>
                    <h3 style="font-size: 20px; margin: 10px 0 0 0; color: #ef4444;">R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background-color: ${profit >= 0 ? '#ecfdf5' : '#fef2f2'}; border-color: ${profit >= 0 ? '#a7f3d0' : '#fecaca'}; text-align: center;">
                    <span style="font-size: 12px; color: ${profit >= 0 ? '#065f46' : '#991b1b'}; font-weight: 600; text-transform: uppercase;">Saldo Líquido</span>
                    <h3 style="font-size: 20px; margin: 10px 0 0 0; color: ${profit >= 0 ? '#047857' : '#b91c1c'};">R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
            </div>

            <!-- Category Breakdown -->
            <h2 style="font-size: 18px; margin-bottom: 15px; color: #444; border-left: 4px solid #db8876; padding-left: 8px;">Resumo por Categorias</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f1f5f9; font-weight: 600;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Categoria</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Entradas</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Saídas</th>
                    </tr>
                </thead>
                <tbody>
                    ${categoryRows || `<tr><td colspan="3" style="text-align: center; padding: 15px; color: #999;">Nenhuma movimentação por categoria.</td></tr>`}
                </tbody>
            </table>

            <!-- Detailed Transactions -->
            <h2 style="font-size: 18px; margin-bottom: 15px; color: #444; border-left: 4px solid #db8876; padding-left: 8px;">Extrato de Transações</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f1f5f9; font-weight: 600;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; width: 120px;">Data</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Descrição</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; width: 150px;">Categoria</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd; width: 130px;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactionRows || `<tr><td colspan="4" style="text-align: center; padding: 15px; color: #999;">Nenhuma transação realizada.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;

    setTimeout(() => {
        window.print();
    }, 100);
}
window.printFinancialReport = printFinancialReport;

function imprimirCupomPedido(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        alert("Pedido não encontrado!");
        return;
    }

    const client = state.clients.find(c => c.id === order.clientId);
    let displayName = "Doce Especial";
    if (order.productId === "custom_cake") {
        displayName = "Bolo Personalizado";
        if (order.notes && order.notes.includes("Bolo Personalizado:")) {
            const lines = order.notes.split('\n');
            const customTitleLine = lines.find(l => l.includes("Bolo Personalizado:"));
            if (customTitleLine) {
                displayName = customTitleLine.replace("Bolo Personalizado:", "").trim();
            }
        }
    } else {
        const product = state.products.find(p => p.id === order.productId);
        displayName = product ? product.name : "Doce Especial";
    }
    const storeName = state.storeConfig.name || "Minha Confeitaria";
    const storePhone = state.storeConfig.phone ? `(${state.storeConfig.phone.substring(0, 2)}) ${state.storeConfig.phone.substring(2, 7)}-${state.storeConfig.phone.substring(7)}` : "";

    let printContainer = document.getElementById("print-receipt-container");
    if (!printContainer) {
        printContainer = document.createElement("div");
        printContainer.id = "print-receipt-container";
        document.body.appendChild(printContainer);
    }

    const dateFormatted = new Date(order.date + "T00:00:00").toLocaleDateString('pt-BR');
    const unitPrice = order.qty > 0 ? (order.val / order.qty) : order.val;
    const totalItem = order.val;

    // Constrói layout de cupom térmico
    printContainer.innerHTML = `
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px;">
            ${storeName.toUpperCase()}
        </div>
        ${storePhone ? `<div style="text-align: center; margin-bottom: 5px;">Fone: ${storePhone}</div>` : ''}
        <div style="text-align: center; margin-bottom: 10px;">================================</div>
        
        <div><strong>PEDIDO:</strong> #${order.id.substring(0, 8).toUpperCase()}</div>
        <div><strong>STATUS:</strong> ${order.status.toUpperCase()}</div>
        <div><strong>DATA:</strong> ${dateFormatted} às ${order.time}</div>
        <div style="margin-bottom: 10px;">================================</div>
        
        <div><strong>CLIENTE:</strong> ${client ? client.name : 'Sem Nome'}</div>
        ${client && client.phone ? `<div><strong>FONE:</strong> ${client.phone}</div>` : ''}
        <div style="margin-bottom: 10px;">================================</div>
        
        <div style="font-weight: bold; margin-bottom: 5px;">ITENS:</div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>${order.qty}x ${displayName} (R$ ${unitPrice.toFixed(2)} un)</span>
            <span>R$ ${totalItem.toFixed(2)}</span>
        </div>
        ${order.notes ? `<div style="font-size: 10px; color: #555; padding-left: 10px; margin-bottom: 5px;">* Obs: ${order.notes}</div>` : ''}
        
        <div style="margin-top: 5px; margin-bottom: 10px;">--------------------------------</div>
        
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin-bottom: 10px;">
            <span>TOTAL:</span>
            <span>R$ ${totalItem.toFixed(2)}</span>
        </div>
        
        <div style="text-align: center; margin-top: 15px; margin-bottom: 5px;">================================</div>
        <div style="text-align: center; font-size: 10px;">Obrigado pela preferência!</div>
        <div style="text-align: center; font-size: 8px; color: #666; margin-top: 5px;">Gerado por ConfeitaAI</div>
        <div style="text-align: center; margin-bottom: 15px;">================================</div>
    `;

    setTimeout(() => {
        window.print();
    }, 100);
}
window.imprimirCupomPedido = imprimirCupomPedido;

function downloadShoppingList(text) {
    if (!text) return;
    
    let cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/<br>/g, '\n')
        .replace(/<li>(.*?)<\/li>/g, '• $1\n')
        .replace(/<.*?>/g, '');

    const blob = new Blob([cleanText], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `confeitaai_lista_compras_${new Date().toISOString().slice(0,10)}.txt`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
window.downloadShoppingList = downloadShoppingList;

// Store Open/Close management functions
function updateQuickToggleUI() {
    const btn = document.getElementById("btn-quick-toggle-store");
    const checkbox = document.getElementById("store-open-toggle");
    if (!btn) return;
    
    const isOpen = state.storeConfig.loja_aberta !== false;
    
    if (checkbox) {
        checkbox.checked = isOpen;
    }
    
    if (isOpen) {
        btn.style.background = "#d1fae5";
        btn.style.color = "#065f46";
        btn.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; animation: pulsing 1.5s infinite;"></span> Aberto (Fechar Loja)`;
    } else {
        btn.style.background = "#fee2e2";
        btn.style.color = "#991b1b";
        btn.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444; display: inline-block;"></span> Fechado (Abrir Loja)`;
    }
}
window.updateQuickToggleUI = updateQuickToggleUI;

async function toggleStoreStatus() {
    state.storeConfig.loja_aberta = state.storeConfig.loja_aberta === false ? true : false;
    
    saveToLocalStorage();
    updateQuickToggleUI();
    
    // Sync with preview if visible
    if (document.getElementById("modal-menu-preview") && document.getElementById("modal-menu-preview").style.display !== "none") {
        openMenuPreview();
    }
    
    // Sincronizar com Supabase se ativo
    if (isSupabaseActive) {
        const loggedInUserId = getLoggedInUserId();
        if (loggedInUserId) {
            try {
                await supabaseClient.from('configuracoes').upsert([{
                    id: loggedInUserId,
                    usuario_id: loggedInUserId,
                    name: state.storeConfig.name || "Minha Confeitaria",
                    slug: state.storeConfig.slug || "docesdaju",
                    phone: state.storeConfig.phone,
                    hours: state.storeConfig.hours,
                    logo: state.storeConfig.logo,
                    banner: state.storeConfig.banner,
                    desc: state.storeConfig.desc,
                    cor_tema: state.storeConfig.cor_tema || "#ff7eb9",
                    loja_aberta: state.storeConfig.loja_aberta
                }]);
                console.log("Status da loja atualizado no Supabase.");
            } catch (err) {
                console.error("Erro ao salvar status no Supabase:", err);
            }
        }
    }
}
window.toggleStoreStatus = toggleStoreStatus;

// Color theme utility functions
function darkenColor(hex, percent) {
    let num = parseInt(hex.replace("#",""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) - amt,
        G = (num >> 8 & 0x00FF) - amt,
        B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<0?0:R>255?255:R)*0x10000 + (G<0?0:G>255?255:G)*0x100 + (B<0?0:B>255?255:B)).toString(16).slice(1);
}

function hexToRgba(hex, alpha) {
    let num = parseInt(hex.replace("#",""), 16),
        R = num >> 16,
        G = num >> 8 & 0x00FF,
        B = num & 0x0000FF;
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
}

function applyStorefrontThemeColor(color) {
    let styleEl = document.getElementById("storefront-theme-overrides");
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "storefront-theme-overrides";
        document.head.appendChild(styleEl);
    }
    
    if (!color) {
        color = "#ff7eb9";
    }
    
    const primary = color;
    const hover = darkenColor(color, 12);
    const light = hexToRgba(color, 0.1);
    
    styleEl.innerHTML = `
        body.standalone-storefront-mode,
        #modal-menu-preview,
        #modal-menu-preview .phone-screen,
        .phone-screen,
        .phone-bag-bar {
            --color-primary: ${primary} !important;
            --color-primary-hover: ${hover} !important;
            --color-primary-light: ${light} !important;
        }
    `;
}
window.applyStorefrontThemeColor = applyStorefrontThemeColor;

// ============================================================================
// STORE CONFIGURATION UX: Image Upload & Compression + Day Toggles
// ============================================================================

function setupStoreConfigUI() {
    // Prevent double binding of event listeners if called multiple times
    if (window.storeConfigUIInitialized) return;
    window.storeConfigUIInitialized = true;

    // 1. Day toggles
    const dayButtons = document.querySelectorAll(".btn-day-toggle");
    dayButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            btn.classList.toggle("active");
        });
    });

    // 2. Image Compression & Preview
    function setupImageUpload(fileInputId, urlInputId, previewId) {
        const fileInput = document.getElementById(fileInputId);
        const urlInput = document.getElementById(urlInputId);
        const previewEl = document.getElementById(previewId);
        
        if (!fileInput || !urlInput || !previewEl) return;
        
        // Update preview when URL changes
        urlInput.addEventListener("input", () => {
            if (urlInput.value && (urlInput.value.startsWith("http") || urlInput.value.startsWith("data:image"))) {
                previewEl.style.backgroundImage = `url('${urlInput.value}')`;
            } else {
                previewEl.style.backgroundImage = "none";
            }
        });

        // Compress and convert file to base64
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    
                    // Max dimensions for compression
                    let maxWidth = 800;
                    let maxHeight = 800;
                    if (fileInputId === "store-banner-file") {
                        maxWidth = 1200;
                        maxHeight = 600;
                    }
                    
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height *= maxWidth / width));
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width *= maxHeight / height));
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress to WebP or JPEG
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.7); // 70% quality
                    
                    // Set inputs
                    urlInput.value = dataUrl;
                    previewEl.style.backgroundImage = `url('${dataUrl}')`;
                    
                    // Reset file input so same file can be selected again
                    fileInput.value = "";
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    setupImageUpload("store-logo-file", "store-logo", "store-logo-preview");
    setupImageUpload("store-banner-file", "store-banner", "store-banner-preview");

    // 3. Theme Color UI bindings
    const themeColorEl = document.getElementById("store-theme-color");
    const presetButtons = document.querySelectorAll(".btn-color-preset");
    const resetColorBtn = document.getElementById("btn-reset-theme-color");
    
    if (themeColorEl) {
        themeColorEl.addEventListener("input", (e) => {
            const color = e.target.value;
            applyStorefrontThemeColor(color);
        });
    }
    
    presetButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const color = btn.getAttribute("data-color");
            if (themeColorEl) {
                themeColorEl.value = color;
                themeColorEl.dispatchEvent(new Event("input"));
            } else {
                applyStorefrontThemeColor(color);
            }
        });
    });
    
    if (resetColorBtn) {
        resetColorBtn.addEventListener("click", () => {
            const originalColor = "#ff7eb9";
            if (themeColorEl) {
                themeColorEl.value = originalColor;
                themeColorEl.dispatchEvent(new Event("input"));
            } else {
                applyStorefrontThemeColor(originalColor);
            }
        });
    }

    // 4. Quick Store Toggle binding
    const quickToggleBtn = document.getElementById("btn-quick-toggle-store");
    if (quickToggleBtn) {
        quickToggleBtn.addEventListener("click", toggleStoreStatus);
    }
}

// Ensure the setup runs
document.addEventListener("DOMContentLoaded", () => {
    setupStoreConfigUI();
});
setTimeout(() => {
    setupStoreConfigUI();
}, 100);

// Helper for Recipe Select
function populateRecipeSelect(selectElement, selectedValue) {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">Sem receita vinculada (não desconta estoque)</option>`;
    state.recipes.forEach(r => {
        const option = document.createElement("option");
        option.value = r.id;
        option.textContent = r.name;
        selectElement.appendChild(option);
    });
    
    // Set value (defaulting to empty string for no selection/warning)
    selectElement.value = selectedValue || "";
    
    // Toggle warning display based on selection
    const warningEl = document.getElementById("recipe-warning-msg");
    if (warningEl) {
        warningEl.style.display = (selectedValue || selectElement.value) ? "none" : "block";
    }
}

// Function to deduct stock based on the recipe of the ordered product
async function deductStockForOrder(order) {
    if (order.productId === "custom_cake") return;
    if (!order.productId || !order.qty) return;

    const prod = state.products.find(p => p.id === order.productId);
    if (!prod || !prod.recipeId) return;

    const recipe = state.recipes.find(r => r.id === prod.recipeId);
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) return;

    const batches = order.qty / (recipe.yield || 1);
    const updates = [];
    
    for (const reqIng of recipe.ingredients) {
        const stockIng = state.ingredients.find(i => i.id === reqIng.ingId);
        if (stockIng) {
            const amountToDeduct = (reqIng.amount || 0) * batches;
            stockIng.qty = Math.max(0, stockIng.qty - amountToDeduct);
            updates.push(stockIng);
            
            if (stockIng.qty <= stockIng.min) {
                console.warn(`Estoque baixo para: ${stockIng.name}`);
            }
        }
    }
    
    if (updates.length > 0) {
        saveToLocalStorage();
        renderActiveTab();
        
        if (isSupabaseActive) {
            try {
                const loggedInUserId = getLoggedInUserId();
                const promises = updates.map(stockIng => {
                    let query = supabaseClient.from('estoque').update({ qty: stockIng.qty }).eq('id', stockIng.id);
                    if (loggedInUserId) query = query.eq('usuario_id', loggedInUserId);
                    return query;
                });
                await Promise.all(promises);
            } catch (e) {
                console.error("Erro ao sincronizar desconto de estoque:", e);
            }
        }
    }
}

// Mobile menu toggle logic
document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    if (mobileBtn && sidebar && backdrop) {
        function toggleMenu() {
            sidebar.classList.toggle('open');
            if (sidebar.classList.contains('open')) {
                backdrop.classList.add('show');
            } else {
                backdrop.classList.remove('show');
            }
        }
        
        mobileBtn.addEventListener('click', toggleMenu);
        backdrop.addEventListener('click', toggleMenu);
        
        // Close menu on link click (mobile)
        const menuLinks = document.querySelectorAll('.menu-item');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    toggleMenu();
                }
            });
        });
    }
});

// ======== FUNÇÕES ADICIONAIS DO NOVO DASHBOARD ========

window.globalDashFilter = "today"; // "today", "7days", "30days", "all", "custom"
window.globalDashCustomMonth = ""; // format "YYYY-MM"
let mainDashboardLineChart = null;

window.setDashboardDateFilter = function(type) {
    window.globalDashFilter = type;
    const menu = document.getElementById("dash-date-menu");
    if (menu) menu.classList.remove("active");
    
    const label = document.getElementById("dash-date-label");
    if (type === 'today') label.innerText = "Hoje";
    if (type === '7days') label.innerText = "Últimos 7 dias";
    if (type === '30days') label.innerText = "Últimos 30 dias";
    if (type === 'all') label.innerText = "Tempo todo";
    
    if (type === 'custom') {
        window.globalDashCustomMonth = document.getElementById("dash-custom-month").value;
        if (!window.globalDashCustomMonth) return;
        const [y, m] = window.globalDashCustomMonth.split('-');
        label.innerText = `${m}/${y}`;
    }
    renderDashboard();
};

window.deleteTransaction = async function(id) {
    if (!confirm("Tem certeza que deseja apagar este lançamento permanentemente?")) return;
    
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    renderActiveTab();
    
    if (isSupabaseActive) {
        try {
            await supabaseClient.from('transacoes').delete().eq('id', id);
            console.log("Lançamento removido do Supabase.");
        } catch (err) {
            console.error("Erro ao apagar no Supabase:", err);
        }
    }
};

window.renderDashboardLineChart = function(transactions) {
    const canvas = document.getElementById("dashboard-line-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    if (window.mainDashboardLineChart) {
        window.mainDashboardLineChart.destroy();
    }
    
    let labels = [];
    let dataPoints = [];
    let counts = [];
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const incomes = transactions.filter(t => t.type === "Entrada");

    if (window.globalDashFilter === 'today') {
        labels = ["Hoje, 0:00", "Hoje, 23:59"];
        const totalToday = incomes.reduce((sum, t) => sum + t.val, 0);
        const countToday = incomes.length;
        dataPoints = [totalToday, totalToday];
        counts = [countToday, countToday];
    } else if (window.globalDashFilter === '7days') {
        for(let i=6; i>=0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}));
        }
    } else if (window.globalDashFilter === '30days') {
        for(let i=29; i>=0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}));
        }
    } else if (window.globalDashFilter === 'custom') {
        if (window.globalDashCustomMonth) {
            const [y, m] = window.globalDashCustomMonth.split('-');
            const daysInMonth = new Date(y, m, 0).getDate();
            for(let i=1; i<=daysInMonth; i++) {
                labels.push(`${i.toString().padStart(2, '0')}/${m}`);
            }
        }
    }

    if (window.globalDashFilter !== 'today' && window.globalDashFilter !== 'all') {
        const salesByDay = {};
        const countByDay = {};
        labels.forEach(l => { salesByDay[l] = 0; countByDay[l] = 0; });
        
        incomes.forEach(t => {
            const dStr = new Date(t.date + "T00:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (salesByDay[dStr] !== undefined) {
                salesByDay[dStr] += t.val;
                countByDay[dStr] += 1;
            }
        });
        dataPoints = labels.map(l => salesByDay[l]);
        counts = labels.map(l => countByDay[l]);
    } else if (window.globalDashFilter === 'all') {
        const salesByDay = {};
        const countByDay = {};
        incomes.forEach(t => {
            const dStr = new Date(t.date + "T00:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
            if (!salesByDay[dStr]) { salesByDay[dStr] = 0; countByDay[dStr] = 0; }
            salesByDay[dStr] += t.val;
            countByDay[dStr] += 1;
        });
        labels = Object.keys(salesByDay).sort((a, b) => {
            const [da, ma, ya] = a.split('/');
            const [db, mb, yb] = b.split('/');
            return new Date(`20${ya}-${ma}-${da}`) - new Date(`20${yb}-${mb}-${db}`);
        });
        if(labels.length === 0) {
            labels = ["Início", "Hoje"];
            dataPoints = [0, 0];
            counts = [0, 0];
        } else if(labels.length === 1) {
            labels.push(labels[0] + " (Atual)");
            dataPoints = [salesByDay[labels[0]], salesByDay[labels[0]]];
            counts = [countByDay[labels[0]], countByDay[labels[0]]];
        } else {
            dataPoints = labels.map(l => salesByDay[l]);
            counts = labels.map(l => countByDay[l]);
        }
    }
    
    const rootStyles = getComputedStyle(document.body);
    const colorPurple = rootStyles.getPropertyValue('--color-purple').trim() || '#8b5cf6';

    window.mainDashboardLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Faturamento',
                data: dataPoints,
                borderColor: colorPurple,
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0,
                fill: false,
                pointBackgroundColor: colorPurple,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#6e768e',
                    bodyColor: '#2d3142',
                    bodyFont: { weight: 'bold', size: 14 },
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            return 'R$ ' + context.raw.toLocaleString('pt-BR', {minimumFractionDigits: 2});
                        },
                        afterLabel: function(context) {
                            const idx = context.dataIndex;
                            return 'Vendas: ' + counts[idx];
                        }
                    }
                }
            },
            scales: {
                y: {
                    position: 'right',
                    beginAtZero: true,
                    border: { display: false },
                    grid: { color: '#f1f5f9', drawBorder: false },
                    ticks: {
                        maxTicksLimit: 3,
                        callback: function(value) { return 'R$ ' + value; }
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        maxTicksLimit: 2,
                        maxRotation: 0,
                        font: { size: 11, color: '#94a3b8' }
                    }
                }
            }
        }
    });
};

// ================= CUSTOM CAKE BUILDER WIDGET =================

const defaultCakeBuilderConfig = {
    enabled: false,
    max_fillings: 3,
    sizes: [
        { name: "Mini Bolo", slices: "6 fatias", price_simples: 45.00, price_frutas: 0.00, price_gourmet: 60.00, topper_simple: 15.00, topper_custom: 25.00 },
        { name: "10 fatias", slices: "10 fatias", price_simples: 64.00, price_frutas: 72.00, price_gourmet: 85.00, topper_simple: 15.00, topper_custom: 25.00 },
        { name: "15 cm", slices: "10 a 12 fatias", price_simples: 100.00, price_frutas: 130.00, price_gourmet: 155.00, topper_simple: 15.00, topper_custom: 25.00 },
        { name: "20 cm", slices: "15 a 20 fatias", price_simples: 145.00, price_frutas: 180.00, price_gourmet: 215.00, topper_simple: 20.00, topper_custom: 30.00 },
        { name: "25 cm", slices: "25 a 30 fatias", price_simples: 200.00, price_frutas: 245.00, price_gourmet: 290.00, topper_simple: 25.00, topper_custom: 35.00 },
        { name: "30 cm", slices: "35 a 45 fatias", price_simples: 270.00, price_frutas: 320.00, price_gourmet: 380.00, topper_simple: 25.00, topper_custom: 35.00 },
        { name: "35 cm", slices: "50 a 60 fatias", price_simples: 340.00, price_frutas: 410.00, price_gourmet: 470.00, topper_simple: 25.00, topper_custom: 35.00 },
        { name: "40 cm", slices: "65 a 80 fatias", price_simples: 420.00, price_frutas: 500.00, price_gourmet: 570.00, topper_simple: 25.00, topper_custom: 35.00 }
    ],
    fillings: {
        Simples: [
            "Ninho",
            "Brigadeiro",
            "Beijinho",
            "Doce de leite",
            "Baba de moça",
            "4 leites"
        ],
        Frutas: [
            "Morango com chantilly",
            "Abacaxi com creme",
            "Pêssego"
        ],
        Gourmet: [
            "Ninho com Nutella",
            "Chocolate trufado",
            "Ferrero / Kinder"
        ]
    }
};

function getCakeBuilderConfig() {
    if (state.storeConfig && state.storeConfig.cake_builder) {
        const cfg = state.storeConfig.cake_builder;
        return {
            enabled: cfg.enabled === true,
            max_fillings: parseInt(cfg.max_fillings) || 3,
            sizes: Array.isArray(cfg.sizes) ? cfg.sizes : defaultCakeBuilderConfig.sizes,
            fillings: (cfg.fillings && typeof cfg.fillings === 'object') ? cfg.fillings : defaultCakeBuilderConfig.fillings
        };
    }
    return defaultCakeBuilderConfig;
}

function getCakeFillings(category) {
    const config = getCakeBuilderConfig();
    return config.fillings[category] || [];
}

window.openCustomCakeBuilder = function() {
    // Hide storefront content and show builder
    document.getElementById("phone-menu-body").style.display = "none";
    document.getElementById("phone-cake-builder-body").style.display = "block";
    
    // Hide bag bar and footer while configuring cake
    const bagBar = document.getElementById("phone-bag-bar");
    if (bagBar) bagBar.style.display = "none";
    
    // Render dynamic sizes dropdown options
    const config = getCakeBuilderConfig();
    const selectEl = document.getElementById("builder-size");
    if (selectEl && config.sizes.length > 0) {
        selectEl.innerHTML = "";
        config.sizes.forEach((s, idx) => {
            const opt = document.createElement("option");
            opt.value = s.name;
            opt.setAttribute("data-slices", s.slices);
            opt.innerText = `${s.name} (${s.slices})`;
            selectEl.appendChild(opt);
        });
        
        // Select the default size "15 cm" or choose first one
        const hasDefault = config.sizes.some(s => s.name === "15 cm");
        selectEl.value = hasDefault ? "15 cm" : config.sizes[0].name;
    }
    
    // Reset inputs
    document.querySelector('input[name="builder-category"][value="Simples"]').checked = true;
    document.querySelector('input[name="builder-topper"][value="Sem Topo"]').checked = true;
    
    onBuilderCategoryChange();
    updateBuilderPrice();
};

window.backToMenuFromBuilder = function() {
    document.getElementById("phone-cake-builder-body").style.display = "none";
    document.getElementById("phone-menu-body").style.display = "block";
    updateCartUI();
};

window.onBuilderCategoryChange = function() {
    const category = document.querySelector('input[name="builder-category"]:checked').value;
    const container = document.getElementById("builder-fillings-container");
    if (!container) return;
    
    container.innerHTML = "";
    const flavors = getCakeFillings(category);
    
    flavors.forEach(flavor => {
        const item = document.createElement("label");
        item.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 8px 10px; cursor: pointer; font-size: 13px; color: var(--color-text-main); border-bottom: 1px solid #f1f5f9; margin: 0;";
        item.innerHTML = `
            <input type="checkbox" name="builder-filling" value="${flavor}" onchange="onFillingCheckboxChange(this)" style="width: auto; accent-color: var(--color-primary); margin: 0;">
            <span>${flavor}</span>
        `;
        container.appendChild(item);
    });
    
    updateBuilderPrice();
};

window.onFillingCheckboxChange = function(checkbox) {
    const config = getCakeBuilderConfig();
    const max = config.max_fillings;
    const checked = document.querySelectorAll('input[name="builder-filling"]:checked');
    if (checked.length > max) {
        checkbox.checked = false;
        alert(`Você pode escolher no máximo ${max} sabores de recheio!`);
    }
};

window.updateBuilderPrice = function() {
    const size = document.getElementById("builder-size").value;
    if (!size) return;
    
    const config = getCakeBuilderConfig();
    const sizeObj = config.sizes.find(s => s.name === size);
    
    const priceSimples = sizeObj ? parseFloat(sizeObj.price_simples) || 0 : 0;
    const priceFrutas = sizeObj ? parseFloat(sizeObj.price_frutas) || 0 : 0;
    const priceGourmet = sizeObj ? parseFloat(sizeObj.price_gourmet) || 0 : 0;
    
    const topperSimple = sizeObj ? parseFloat(sizeObj.topper_simple) || 0 : 0;
    const topperCustom = sizeObj ? parseFloat(sizeObj.topper_custom) || 0 : 0;
    
    // Disable builder categories that are not available (price 0)
    const simplesRadio = document.querySelector('input[name="builder-category"][value="Simples"]');
    const frutasRadio = document.querySelector('input[name="builder-category"][value="Frutas"]');
    const gourmetRadio = document.querySelector('input[name="builder-category"][value="Gourmet"]');
    
    if (simplesRadio) {
        if (priceSimples === 0) {
            simplesRadio.disabled = true;
            simplesRadio.parentElement.style.opacity = "0.5";
        } else {
            simplesRadio.disabled = false;
            simplesRadio.parentElement.style.opacity = "1";
        }
    }
    
    if (frutasRadio) {
        if (priceFrutas === 0) {
            frutasRadio.disabled = true;
            frutasRadio.parentElement.style.opacity = "0.5";
            if (frutasRadio.checked) {
                simplesRadio.checked = true;
                onBuilderCategoryChange();
                return;
            }
        } else {
            frutasRadio.disabled = false;
            frutasRadio.parentElement.style.opacity = "1";
        }
    }
    
    if (gourmetRadio) {
        if (priceGourmet === 0) {
            gourmetRadio.disabled = true;
            gourmetRadio.parentElement.style.opacity = "0.5";
            if (gourmetRadio.checked) {
                simplesRadio.checked = true;
                onBuilderCategoryChange();
                return;
            }
        } else {
            gourmetRadio.disabled = false;
            gourmetRadio.parentElement.style.opacity = "1";
        }
    }
    
    // Update base price labels
    const labelSimples = document.getElementById("builder-cat-price-simples");
    const labelFrutas = document.getElementById("builder-cat-price-frutas");
    const labelGourmet = document.getElementById("builder-cat-price-gourmet");
    
    if (labelSimples) labelSimples.innerText = priceSimples > 0 ? `R$ ${priceSimples.toFixed(2)}` : "Não disponível";
    if (labelFrutas) labelFrutas.innerText = priceFrutas > 0 ? `R$ ${priceFrutas.toFixed(2)}` : "Não disponível";
    if (labelGourmet) labelGourmet.innerText = priceGourmet > 0 ? `R$ ${priceGourmet.toFixed(2)}` : "Não disponível";
    
    // Update topper prices
    const labelTopperSimples = document.getElementById("builder-topper-price-simples");
    const labelTopperPersonalizado = document.getElementById("builder-topper-price-personalizado");
    
    if (labelTopperSimples) labelTopperSimples.innerText = `+ R$ ${topperSimple.toFixed(2)}`;
    if (labelTopperPersonalizado) labelTopperPersonalizado.innerText = `+ R$ ${topperCustom.toFixed(2)}`;
    
    // Calculate total price
    const category = document.querySelector('input[name="builder-category"]:checked').value;
    const topper = document.querySelector('input[name="builder-topper"]:checked').value;
    
    let basePrice = 0;
    if (category === "Simples") basePrice = priceSimples;
    else if (category === "Frutas") basePrice = priceFrutas;
    else if (category === "Gourmet") basePrice = priceGourmet;
    
    let topperPrice = 0;
    if (topper === "Topo Simples") topperPrice = topperSimple;
    else if (topper === "Topo Personalizado") topperPrice = topperCustom;
    
    const total = basePrice + topperPrice;
    
    const totalEl = document.getElementById("builder-total-price");
    if (totalEl) totalEl.innerText = `R$ ${total.toFixed(2)}`;
};

window.addCustomCakeToCart = function(e) {
    if (e) e.preventDefault();
    
    const size = document.getElementById("builder-size").value;
    const selectEl = document.getElementById("builder-size");
    const slices = selectEl.options[selectEl.selectedIndex].getAttribute("data-slices") || "";
    
    const category = document.querySelector('input[name="builder-category"]:checked').value;
    const topper = document.querySelector('input[name="builder-topper"]:checked').value;
    
    const selectedFillings = Array.from(document.querySelectorAll('input[name="builder-filling"]:checked')).map(cb => cb.value);
    
    if (selectedFillings.length === 0) {
        alert("Escolha pelo menos 1 sabor de recheio!");
        return;
    }
    
    const config = getCakeBuilderConfig();
    const sizeObj = config.sizes.find(s => s.name === size);
    
    const priceSimples = sizeObj ? parseFloat(sizeObj.price_simples) || 0 : 0;
    const priceFrutas = sizeObj ? parseFloat(sizeObj.price_frutas) || 0 : 0;
    const priceGourmet = sizeObj ? parseFloat(sizeObj.price_gourmet) || 0 : 0;
    
    const topperSimple = sizeObj ? parseFloat(sizeObj.topper_simple) || 0 : 0;
    const topperCustom = sizeObj ? parseFloat(sizeObj.topper_custom) || 0 : 0;
    
    let basePrice = 0;
    if (category === "Simples") basePrice = priceSimples;
    else if (category === "Frutas") basePrice = priceFrutas;
    else if (category === "Gourmet") basePrice = priceGourmet;
    
    let topperPrice = 0;
    if (topper === "Topo Simples") topperPrice = topperSimple;
    else if (topper === "Topo Personalizado") topperPrice = topperCustom;
    
    const total = basePrice + topperPrice;
    
    const customItem = {
        customId: "custom_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        isCustom: true,
        qty: 1,
        customName: `Bolo Personalizado ${size} (${slices})`,
        customPrice: total,
        customEmoji: "🍰",
        customDetails: `Recheio ${category}: ${selectedFillings.join(", ")} | Topo: ${topper}`
    };
    
    customerCart.push(customItem);
    
    // Go back to storefront
    document.getElementById("phone-cake-builder-body").style.display = "none";
    document.getElementById("phone-menu-body").style.display = "block";
    updateCartUI();
};

window.addToCartCustom = function(customId) {
    const item = customerCart.find(i => i.customId === customId);
    if (item) {
        item.qty++;
    }
    updateCartUI();
};

window.removeFromCartCustom = function(customId) {
    const idx = customerCart.findIndex(i => i.customId === customId);
    if (idx !== -1) {
        customerCart[idx].qty--;
        if (customerCart[idx].qty <= 0) {
            customerCart.splice(idx, 1);
        }
    }
    updateCartUI();
};
