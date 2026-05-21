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

// Global Pricing Parameters
let DEFAULT_MARKUP = parseFloat(localStorage.getItem("confeitaai_default_markup")) || 200;
let DEFAULT_PACKAGING = parseFloat(localStorage.getItem("confeitaai_default_packaging")) || 5.00;
let DEFAULT_HOURLY_RATE = parseFloat(localStorage.getItem("confeitaai_default_hourly_rate")) || 15.00;

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
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            isSupabaseActive = true;
            console.log("Supabase inicializado com sucesso! 🌐");
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
    products: [],
    ingredients: [],
    clients: [],
    orders: [],
    transactions: [],
    recipes: [],
    cacauMessages: [],
    storeConfig: {
        name: "Doces da Ju",
        slug: "docesdaju",
        hours: "Seg a Sex, 09h às 18h",
        logo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop",
        desc: "Nossos doces e bolos gourmet são produzidos com ingredientes nobres e muito amor para adoçar os seus momentos mais especiais."
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
        name: "Doces da Ju",
        slug: "docesdaju",
        hours: "Seg a Sex, 09h às 18h",
        logo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop",
        desc: "Nossos doces e bolos gourmet são produzidos com ingredientes nobres e muito amor para adoçar os seus momentos mais especiais."
    }
};

function getLoggedInUserId() {
    const session = localStorage.getItem("confeitaai_session");
    if (!session) return null;
    try {
        const sessionData = JSON.parse(session);
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
        return localStorage.getItem(`confeitaai_state_${userId}`) || localStorage.getItem("confeitaai_state");
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
        state = sanitizeAndMergeState(seedData);
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
    const storefrontSlug = urlParams.get('loja');
    if (storefrontSlug) {
        try {
            console.log("Carregando cardápio digital isolado para a loja:", storefrontSlug);
            // Busca as configurações da loja associada a esse slug
            const { data: configData, error: configErr } = await supabaseClient
                .from('configuracoes')
                .select('*')
                .eq('slug', storefrontSlug)
                .limit(1)
                .maybeSingle();

            if (configErr) throw configErr;

            if (configData) {
                state.storeConfig = {
                    name: configData.name || state.storeConfig.name,
                    slug: configData.slug || state.storeConfig.slug,
                    phone: configData.phone || state.storeConfig.phone,
                    hours: configData.hours || state.storeConfig.hours,
                    logo: configData.logo || state.storeConfig.logo,
                    desc: configData.desc || state.storeConfig.desc
                };

                const ownerId = configData.usuario_id;
                if (ownerId) {
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
                        recipeId: p.recipe_id || null
                    }));
                } else {
                    console.warn("Loja sem usuario_id configurado.");
                    state.products = [];
                }
            } else {
                console.warn("Loja com slug não cadastrado no Supabase:", storefrontSlug);
                state.products = [];
            }

            // Salva no LocalStorage e atualiza formulários
            saveToLocalStorage();
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
            } catch (e) {}
        }
        const isSuperAdmin = userRole === "Super Admin";

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

        if (loggedInUserId) {
            if (!isSuperAdmin) {
                prodQuery = prodQuery.eq('usuario_id', loggedInUserId);
                clientQuery = clientQuery.eq('usuario_id', loggedInUserId);
                stockQuery = stockQuery.eq('usuario_id', loggedInUserId);
                orderQuery = orderQuery.eq('usuario_id', loggedInUserId);
                transQuery = transQuery.eq('usuario_id', loggedInUserId);
                recipeQuery = recipeQuery.eq('usuario_id', loggedInUserId);
                msgQuery = msgQuery.eq('usuario_id', loggedInUserId);
                configQuery = configQuery.eq('usuario_id', loggedInUserId);
                
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
            storeConfigResult
        ] = await Promise.all([
            prodQuery,
            clientQuery,
            stockQuery,
            orderQuery,
            transQuery,
            recipeQuery,
            msgQuery,
            configQuery.limit(1).maybeSingle().then(res => res, err => ({ data: null, error: err }))
        ]);

        if (prodErr || clientErr || stockErr || orderErr || transErr || recipeErr || msgErr) {
            throw new Error("Erro nas tabelas");
        }

        // Carregar colaboradores com segurança
        let userData = [];
        try {
            const { data, error } = await userQuery;
            if (error) {
                console.warn("Tabela 'usuarios' não existe no Supabase. Usando seed local.");
                userData = JSON.parse(JSON.stringify(seedData.users));
            } else {
                userData = data || [];
            }
        } catch (e) {
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
            recipeId: p.recipe_id || null
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
            margin: parseFloat(r.margin) || 0
        }));

        state.cacauMessages = (msgData || []).map(m => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            time: m.time
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

        if (storeConfigResult && storeConfigResult.data) {
            const sc = storeConfigResult.data;
            state.storeConfig = {
                name: sc.name || state.storeConfig.name,
                slug: sc.slug || state.storeConfig.slug,
                phone: sc.phone || state.storeConfig.phone,
                hours: sc.hours || state.storeConfig.hours,
                logo: sc.logo || state.storeConfig.logo,
                desc: sc.desc || state.storeConfig.desc
            };
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
        applyPermissions(profile.role);

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
            if (plan === 'Trial' && expires && new Date() > expires) {
                showTrialExpiredModal();
                return true;
            }
            // Show trial countdown badge if within 3 days
            if (plan === 'Trial' && expires) {
                const daysLeft = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24));
                if (daysLeft <= 3 && daysLeft > 0) {
                    const badge = document.createElement('div');
                    badge.id = 'trial-countdown-banner';
                    badge.style.cssText = 'position:fixed;top:0;left:0;right:0;background:linear-gradient(90deg,#f59e0b,#ef4444);color:white;text-align:center;padding:8px;font-size:13px;font-weight:600;z-index:9999;';
                    badge.innerHTML = `⏳ Seu período de teste termina em <strong>${daysLeft} dia${daysLeft > 1 ? 's' : ''}</strong>! <a href="#" onclick="showTrialExpiredModal()" style="color:white;text-decoration:underline;margin-left:8px;">Assinar Plano PRO →</a>`;
                    if (!document.getElementById('trial-countdown-banner')) document.body.prepend(badge);
                }
            }
        }

        renderActiveTab();
        return true;
    }

    function showTrialExpiredModal() {
        let modal = document.getElementById('modal-trial-expired');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-trial-expired';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);';
            modal.innerHTML = `
                <div style="background:white;border-radius:24px;padding:40px;max-width:480px;width:100%;text-align:center;box-shadow:0 30px 60px rgba(0,0,0,0.3);">
                    <div style="font-size:60px;margin-bottom:16px;">🔒</div>
                    <h2 style="font-size:24px;font-weight:800;margin-bottom:12px;color:#1e293b;">Seu período de teste acabou!</h2>
                    <p style="color:#64748b;font-size:15px;margin-bottom:28px;line-height:1.6;">Para continuar usando o ConfeitaAI com todos os recursos de estoque, cardápio digital e a IA Cacau, assine o Plano PRO.</p>
                    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:16px;padding:24px;margin-bottom:24px;">
                        <div style="color:white;font-size:14px;opacity:0.8;margin-bottom:4px;">Plano PRO</div>
                        <div style="color:white;font-size:42px;font-weight:800;">R$ 29,90<span style="font-size:16px;font-weight:400;">/mês</span></div>
                        <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:8px;">Pedidos ilimitados • IA ilimitada • Suporte prioritário</div>
                    </div>
                    <button onclick="window.open('landing.html#planos','_blank')" style="width:100%;padding:14px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:12px;">✨ Assinar Agora</button>
                    <button onclick="supabaseClient?.auth.signOut().then(()=>location.reload())" style="width:100%;padding:12px;background:none;border:1px solid #e2e8f0;border-radius:12px;font-size:14px;color:#64748b;cursor:pointer;">Sair da conta</button>
                </div>`;
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
    }

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
    state = sanitizeAndMergeState(seedData);
    
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
    const username = document.getElementById("setup-username").value.trim().toLowerCase().replace(/\s+/g, "");
    const password = document.getElementById("setup-password").value;
    const confirm  = document.getElementById("setup-password-confirm").value;
    const errEl    = document.getElementById("setup-error-msg");

    function showSetupError(msg) {
        errEl.textContent = "❌ " + msg;
        errEl.style.display = "block";
    }

    if (!fullName || !email || !username || !password || !confirm) return showSetupError("Preencha todos os campos obrigatórios.");
    if (username.length < 3) return showSetupError("O nome de usuário deve ter pelo menos 3 caracteres.");
    if (password.length < 6) return showSetupError("A senha deve ter pelo menos 6 caracteres.");
    if (password !== confirm) return showSetupError("As senhas não coincidem. Tente novamente.");

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
            options: { data: { name: fullName, username } }
        });

        if (authErr) throw authErr;

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
        if (err.code === '23505') {
            return showSetupError("Este nome de usuário já está em uso. Escolha outro.");
        }
        return showSetupError(err.message || "Erro ao criar conta. Tente novamente.");
    } finally {
        hideLoadingIndicator();
    }
}


function applyPermissions(role) {
    const admMenuItem = document.querySelector(".sidebar-menu a[data-tab='adm']");
    const precificacaoMenuItem = document.querySelector(".sidebar-menu a[data-tab='precificacao']");

    if (admMenuItem) admMenuItem.style.display = "flex";
    if (precificacaoMenuItem) precificacaoMenuItem.style.display = "flex";

    if (role === "Auxiliar") {
        if (admMenuItem) admMenuItem.style.display = "none";
        if (precificacaoMenuItem) precificacaoMenuItem.style.display = "none";
    } else if (role === "Confeiteira") {
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
            const user = state.users.find(u => u.username === sessionData.username);
            if (user) {
                const role = user.role;
                if (role === "Auxiliar" && ["precificacao", "adm"].includes(tabId)) {
                    tabId = "dashboard";
                } else if (role === "Confeiteira" && tabId === "adm") {
                    tabId = "dashboard";
                }
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
    const lojaSlug = urlParams.get('loja');
    if (lojaSlug) {
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
        const url = `index.html?loja=${slug}`;
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
    
    // Auto-fill product price when a recipe is selected
    safeBind("prod-recipe", "change", (e) => {
        const recipeId = e.target.value;
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
            .replace(/[^a-z0-9-_]/g, "");
            
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
        
        if (!slugVal) {
            alert("Por favor, insira um link personalizado (slug) válido.");
            return;
        }
        
        // Otimista: Salvar localmente e atualizar UI instantaneamente
        state.storeConfig = {
            name: nameVal || "Doces da Ju",
            slug: slugVal,
            phone: phoneVal,
            hours: hoursVal,
            logo: logoVal || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop",
            banner: bannerVal || "",
            desc: descVal || ""
        };
        
        saveToLocalStorage();
        updateStoreShowcase();
        
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
                    desc: state.storeConfig.desc
                }]).then(({ error }) => {
                    if (error) {
                        console.error("Erro ao salvar no Supabase:", error);
                    } else {
                        console.log("Configurações salvas no Supabase com sucesso.");
                    }
                }).catch(err => {
                    console.error("Erro assíncrono ao salvar configurações:", err);
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
        const origin = window.location.origin + window.location.pathname;
        const link = `${origin}?loja=${slug}`;
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
                simulateReceiptOCR();
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
    safeBind("search-recipe", "input", (e) => renderReceitas(e.target.value));

    // Recipe Row dynamic calculations
    safeBind("btn-recipe-add-row", "click", () => addRecipeIngredientRow());
    safeBind("rec-margin", "input", calculateRecipeCostsInRealTime);
    safeBind("rec-prep-time", "input", calculateRecipeCostsInRealTime);
    safeBind("rec-packaging-cost", "input", calculateRecipeCostsInRealTime);
    safeBind("rec-yield", "input", calculateRecipeCostsInRealTime);

    // Calendar Navigation Buttons
    safeBind("btn-prev-month", "click", handlePrevMonth);
    safeBind("btn-next-month", "click", handleNextMonth);

    // Dashboard Month Navigation Buttons
    safeBind("btn-prev-month-dash", "click", () => {
        dashSelectedMonth--;
        if (dashSelectedMonth < 0) {
            dashSelectedMonth = 11;
            dashSelectedYear--;
        }
        renderDashboard();
    });
    safeBind("btn-next-month-dash", "click", () => {
        dashSelectedMonth++;
        if (dashSelectedMonth > 11) {
            dashSelectedMonth = 0;
            dashSelectedYear++;
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
        
        const packagingInput = document.getElementById("rec-packaging-cost");
        if (packagingInput) packagingInput.value = DEFAULT_PACKAGING.toFixed(2);
        
        calculateRecipeCostsInRealTime();
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
    const now = new Date();
    const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                        "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const monthLabel = monthNames[dashSelectedMonth];
    const yearLabel = dashSelectedYear;

    // Update the main elegant navigator label
    const dashSelectedMonthLabel = document.getElementById("dash-selected-month-label");
    if (dashSelectedMonthLabel) {
        dashSelectedMonthLabel.innerText = `${monthLabel} ${yearLabel}`;
    }

    // Set month label in all placeholders (for compatibility / titles)
    ["dash-month-label","dash-month-label-2","dash-cashflow-month","dash-chart-month"].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerText = monthLabel;
    });

    // Helper: check if date string belongs to the currently navigated month/year
    function isThisMonth(dateStr) {
        if (!dateStr) return false;
        const d = new Date(dateStr + "T00:00:00");
        return d.getMonth() === dashSelectedMonth && d.getFullYear() === dashSelectedYear;
    }

    // Financial metrics filtered to navigated month
    const monthTrans = state.transactions.filter(t => isThisMonth(t.date));
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
    const monthOrders = state.orders.filter(o => isThisMonth(o.date));
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
            urgentDiv.innerHTML = `<div class="empty-state"><p>Nenhuma encomenda ativa em ${monthLabel}!</p></div>`;
        } else {
            activeOrders.forEach(o => {
                const client  = state.clients.find(c => c.id === o.clientId);
                const product = state.products.find(p => p.id === o.productId);
                const rawDate = new Date(o.date + "T00:00:00");
                const fmtDate = rawDate.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" });
                const isToday = now.toDateString() === rawDate.toDateString();
                let badgeClass = "badge";
                if (o.status === "Em Produção" || o.status === "Em Producao") badgeClass = "badge badge-warning";
                else if (o.status === "Pronto")  badgeClass = "badge badge-success";
                urgentDiv.innerHTML += `
                    <div class="compact-order-item">
                        <div class="compact-order-info">
                            <span class="compact-order-title">${o.qty}x ${product ? product.name : "Doce Especial"}</span>
                            <span class="compact-order-client">Cliente: ${client ? client.name : "Convidado"} (${o.time})</span>
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
            transList.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px 0;color:var(--color-text-muted);">Nenhum lançamento em ${monthLabel}.</td></tr>`;
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
                    </tr>`;
            });
        }
    }

    // Update SVG chart with monthly filtered metrics
    renderSvgChart(income, expense);
}

// B. CARDAPIO VIEW
function renderCardapio(searchQuery = "") {
    const list = document.getElementById("products-list");
    list.innerHTML = "";

    const filtered = state.products.filter(p => {
        // Enforce strict business rule: product MUST have a valid associated recipe
        const hasValidRecipe = state.recipes.some(r => r.id === p.recipeId);
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
        list.innerHTML += `
            <div class="product-card">
                <div class="product-emoji-banner">
                    ${p.emoji}
                    <span class="badge badge-purple product-badge">${p.category}</span>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${p.name}</h3>
                    <p class="product-desc">${p.desc || p.description || "Sem descrição cadastrada."}</p>
                    <div class="product-footer">
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

        const cardHtml = `
            <div class="kanban-card ${urgentClass}" draggable="true" ondragstart="drag(event, '${o.id}')">
                <div class="kanban-card-title">${product ? product.emoji : "🧁"} ${o.qty}x ${product ? product.name : "Doce Especial"}</div>
                <div class="kanban-card-client">Cliente: <strong>${client ? client.name : "Sem Nome"}</strong></div>
                <p style="font-size: 11px; color: var(--color-text-muted); line-height:1.3;">${o.notes || ""}</p>
                <div class="kanban-card-details">
                    <span class="kanban-card-date">${formattedDate} às ${o.time}</span>
                    <span class="kanban-card-val">R$ ${o.val.toFixed(2)}</span>
                </div>
                <div class="kanban-card-actions" style="display: flex; gap: 5px;">
                    ${o.status !== "Recebido" ? `<button class="btn btn-outline btn-sm" title="Voltar fase" onclick="moveOrderStatus('${o.id}', 'prev')">←</button>` : ''}
                    ${o.status === "Pronto" ? `<button class="btn btn-success btn-sm" style="flex: 1; padding: 2px 5px;" onclick="notifyClientPickup('${o.id}')">Avisar Cliente</button>` : ''}
                    ${o.status === "Entregue" ? `<button class="btn btn-outline btn-sm" title="Baixar Recibo PDF" style="flex: 1; padding: 2px 5px; color: #e11d48; border-color: #fca5a5;" onclick="gerarReciboPDF('${o.id}')">📄 PDF</button>` : ''}
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
}

// D. ESTOQUE VIEW
function renderEstoque(searchQuery = "") {
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
    const list = document.getElementById("clients-list");
    list.innerHTML = "";

    const filtered = state.clients.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.phone.includes(searchQuery)
    );

    if (filtered.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="text-align: center; padding: 30px 0; color: var(--color-text-muted);">
                    Nenhum cliente cadastrado. 👥
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(c => {
        list.innerHTML += `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td><a href="https://wa.me/55${c.phone}" target="_blank" class="btn-text" style="text-decoration:none;">🟢 WhatsApp (${c.phone})</a></td>
                <td><span class="badge">${c.orderCount} pedidos</span></td>
                <td><strong>R$ ${c.totalSpent.toFixed(2)}</strong></td>
                <td>
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
    let totalCost = 0;
    const missingIngredients = [];
    r.ingredients.forEach(ri => {
        const ing = state.ingredients.find(i => i.id === ri.ingId);
        if (ing) {
            totalCost += ing.unit === 'un' ? ing.price * ri.amount : (ing.price / 1000) * ri.amount;
        } else {
            missingIngredients.push(ri.ingId);
        }
    });
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
    const income = state.transactions.filter(t => t.type === "Entrada").reduce((sum, t) => sum + t.val, 0);
    const expense = state.transactions.filter(t => t.type === "Saída").reduce((sum, t) => sum + t.val, 0);
    const profit = income - expense;

    document.getElementById("fin-income").innerText = `R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById("fin-expense").innerText = `R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    const profitEl = document.getElementById("fin-profit");
    profitEl.innerText = `R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    if (profit >= 0) {
        profitEl.style.color = "var(--color-success)";
    } else {
        profitEl.style.color = "var(--color-danger)";
    }

    const transList = document.getElementById("transactions-list");
    transList.innerHTML = "";

    const sortedTrans = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));

    if (sortedTrans.length === 0) {
        transList.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="text-align: center; padding: 20px 0; color: var(--color-text-muted);">
                    Nenhum lançamento no fluxo de caixa. 💸
                </td>
            </tr>
        `;
    } else {
        sortedTrans.forEach(t => {
            const isEntry = t.type === "Entrada";
            const valClass = isEntry ? "text-success" : "text-danger";
            const sign = isEntry ? "+" : "-";

            const rawDate = new Date(t.date + "T00:00:00");
            const formattedDate = rawDate.toLocaleDateString("pt-BR");

            transList.innerHTML += `
                <tr>
                    <td>${formattedDate}</td>
                    <td><strong>${t.desc}</strong></td>
                    <td><span class="badge ${isEntry ? 'badge-success' : 'badge-danger'}">${t.type}</span></td>
                    <td><span class="badge">${t.category}</span></td>
                    <td class="${valClass}"><strong>${sign} R$ ${t.val.toFixed(2)}</strong></td>
                </tr>
            `;
        });
    }

    renderSvgChart(income, expense);
}

function renderSvgChart(income, expense) {
    const box = document.getElementById("svg-chart-box");
    const profit = income - expense;
    const maxVal = Math.max(income, expense, Math.abs(profit), 100);
    const incHeight = (income / maxVal) * 160;
    const expHeight = (expense / maxVal) * 160;
    const profHeight = (Math.abs(profit) / maxVal) * 160;
    
    const profColorVar = profit >= 0 ? "var(--color-purple)" : "var(--color-danger)";
    const profGradient = profit >= 0 ? "url(#grad-profit)" : "url(#grad-expense)";

    box.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 350 220" style="display: block;">
            <line x1="45" y1="20" x2="330" y2="20" stroke="var(--color-text-muted)" stroke-opacity="0.15" stroke-width="1" />
            <line x1="45" y1="100" x2="330" y2="100" stroke="var(--color-text-muted)" stroke-opacity="0.15" stroke-width="1" />
            <line x1="45" y1="180" x2="330" y2="180" stroke="var(--color-text-muted)" stroke-opacity="0.4" stroke-width="2" />
            
            <text x="40" y="185" fill="var(--color-text-muted)" font-size="10" text-anchor="end">R$ 0</text>
            <text x="40" y="105" fill="var(--color-text-muted)" font-size="10" text-anchor="end">R$ ${(maxVal/2).toFixed(0)}</text>
            <text x="40" y="25" fill="var(--color-text-muted)" font-size="10" text-anchor="end">R$ ${maxVal.toFixed(0)}</text>

            <rect x="70" y="${180 - incHeight}" width="50" height="${incHeight}" fill="url(#grad-income)" rx="6" />
            <text x="95" y="${175 - incHeight}" fill="var(--color-success)" font-weight="700" font-size="11" text-anchor="middle">R$ ${income.toFixed(0)}</text>
            <text x="95" y="198" fill="var(--color-text-main)" font-size="11" font-weight="600" text-anchor="middle">Receitas</text>

            <rect x="155" y="${180 - expHeight}" width="50" height="${expHeight}" fill="url(#grad-expense)" rx="6" />
            <text x="180" y="${175 - expHeight}" fill="var(--color-danger)" font-weight="700" font-size="11" text-anchor="middle">R$ ${expense.toFixed(0)}</text>
            <text x="180" y="198" fill="var(--color-text-main)" font-size="11" font-weight="600" text-anchor="middle">Despesas</text>
            
            <rect x="240" y="${180 - profHeight}" width="50" height="${profHeight}" fill="${profGradient}" rx="6" />
            <text x="265" y="${175 - profHeight}" fill="${profColorVar}" font-weight="700" font-size="11" text-anchor="middle">R$ ${profit.toFixed(0)}</text>
            <text x="265" y="198" fill="var(--color-text-main)" font-size="11" font-weight="600" text-anchor="middle">Lucro</text>

            <defs>
                <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--color-success)" />
                    <stop offset="100%" stop-color="var(--color-success)" stop-opacity="0.6" />
                </linearGradient>
                <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--color-danger)" />
                    <stop offset="100%" stop-color="var(--color-danger)" stop-opacity="0.6" />
                </linearGradient>
                <linearGradient id="grad-profit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--color-purple)" />
                    <stop offset="100%" stop-color="var(--color-purple)" stop-opacity="0.6" />
                </linearGradient>
            </defs>
        </svg>
    `;
}

// H. CACAU CHAT VIEW
function renderCacauChat() {
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

    const targetId = id || "p_" + Date.now();
    const newProduct = { 
        id: targetId, 
        name, 
        price, 
        category, 
        desc, 
        description: desc,
        emoji,
        recipeId: recipeId || null
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
                let query = supabaseClient.from('produtos').update({ name, price, category, description: desc, emoji, recipe_id: recipeId || null }).eq('id', id);
                if (loggedInUserId) query = query.eq('usuario_id', loggedInUserId);
                await query;
            } else {
                const payload = { id: targetId, name, price, category, description: desc, emoji, recipe_id: recipeId || null };
                if (loggedInUserId) payload.usuario_id = loggedInUserId;
                await supabaseClient.from('produtos').insert([payload]);
            }
        } catch (err) {
            console.error("Erro ao sincronizar produto:", err);
        }
    }
}

function editProduct(id) {
    const prod = state.products.find(p => p.id === id);
    if (!prod) return;

    document.getElementById("prod-id").value = prod.id;
    document.getElementById("prod-name").value = prod.name;
    document.getElementById("prod-price").value = prod.price;
    document.getElementById("prod-category").value = prod.category;
    document.getElementById("prod-desc").value = prod.desc || prod.description || "";
    document.getElementById("prod-image").value = prod.emoji;

    // Popular select de receitas e selecionar a vinculada
    const recipeSelect = document.getElementById("prod-recipe");
    if (recipeSelect) {
        populateRecipeSelect(recipeSelect, prod.recipeId || "");
    }

    document.getElementById("product-modal-title").innerText = "Editar Produto";
    openModal("modal-product");
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
    const transDate = new Date().toISOString().split('T')[0];
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

    const newId = "o_" + Date.now();
    const newOrder = { id: newId, clientId, productId, qty, val, date, time, status: "Recebido", notes };

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
async function moveOrderStatus(id, direction) {
    const order = state.orders.find(o => o.id === id);
    if (!order) return;

    const stages = ["Recebido", "Em Produção", "Pronto", "Entregue"];
    const currIdx = stages.indexOf(order.status);
    
    if (direction === "next" && currIdx < stages.length - 1) {
        const nextStatus = stages[currIdx + 1];
        const transId = "t_" + Date.now();
        const transDate = new Date().toISOString().split('T')[0];
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

// Drag & Drop Kanban Handlers
function allowDrop(e) {
    e.preventDefault();
}

function drag(e, id) {
    e.dataTransfer.setData("orderId", id);
}

async function drop(e, targetStatus) {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("orderId");
    const order = state.orders.find(o => o.id === orderId);
    
    if (order && order.status !== targetStatus) {
        const wasEntregue = order.status === "Entregue";
        const transId = "t_" + Date.now();
        const transDate = new Date().toISOString().split('T')[0];
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
    const packagingCost = parseFloat(document.getElementById("rec-packaging-cost").value) || 0;
    const laborCost = prepTime * DEFAULT_HOURLY_RATE;
    const totalCost = ingredientsCost + laborCost + packagingCost;
    
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
    return totalCost;
}

async function handleRecipeSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("rec-name").value;
    const yieldCount = parseInt(document.getElementById("rec-yield").value) || 10;
    const margin = parseFloat(document.getElementById("rec-margin").value) || 200;

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
    const newRecipe = { id: newId, name, yield: yieldCount, ingredients, margin };

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
            const payload = { id: newId, name, yield: yieldCount, ingredients, margin };
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

// exportRecipeToProduct removed// ================= CARDAPIO DIGITAL CUSTOMER STOREFRONT SIMULATOR =================

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
    if (drawer) drawer.classList.add("active");
    if (backdrop) backdrop.classList.add("active");
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

function openMenuPreview() {
    // Reset client cart and filter states
    customerCart = [];
    activeCategoryFilter = "all";
    activeSearchFilter = "";
    
    // Clear form inputs
    const custName = document.getElementById("phone-cust-name");
    const custPhone = document.getElementById("phone-cust-phone");
    const custAddr = document.getElementById("phone-cust-address");
    if (custName) custName.value = "";
    if (custPhone) custPhone.value = "";
    if (custAddr) custAddr.value = "";
    
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
    
    // Build storefront DOM
    const phoneBody = document.getElementById("phone-menu-body");
    phoneBody.innerHTML = `
        <div class="phone-shop-header-container">
            <div class="phone-shop-cover">
                <img src="${state?.storeConfig?.logo || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop'}" class="phone-shop-cover-img" alt="Capa da Loja">
                <div class="phone-shop-avatar-container">
                    <img src="${state?.storeConfig?.logo || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop'}" class="phone-shop-avatar" alt="Logo da Loja">
                </div>
            </div>
            <div class="phone-shop-info">
                <div class="phone-shop-name">
                    ${state?.storeConfig?.name || "Minha Confeitaria"}
                    <span class="phone-status-badge phone-status-open"><span></span> Aberto</span>
                </div>
                <p class="phone-shop-desc">${state?.storeConfig?.desc || "Os melhores doces artesanais."}</p>
                <div class="phone-shop-meta">
                    <span class="phone-status-hours">🕒 ${state?.storeConfig?.hours || "Consulte nossos horários"}</span>
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

    // Render category chips
    renderCategoryChips();
    
    // Render product list initially
    renderStorefrontProducts();

    // Reset bag bar display
    updateCartUI();

    // Bind floating bag bar click to open cart drawer
    const bagBar = document.getElementById("phone-bag-bar");
    if (bagBar) {
        // Remove existing listener if any and add clean one
        const newBagBar = bagBar.cloneNode(true);
        bagBar.parentNode.replaceChild(newBagBar, bagBar);
        newBagBar.addEventListener("click", openPhoneCartDrawer);
    }

    openModal("modal-menu-preview");
}

function renderCategoryChips() {
    const scrollContainer = document.getElementById("phone-categories-scroll");
    if (!scrollContainer) return;
    
    scrollContainer.innerHTML = "";
    
    // Default "Todos" chip
    const allChip = document.createElement("div");
    allChip.className = "phone-cat-chip active";
    allChip.innerText = "Todos";
    allChip.setAttribute("data-cat", "all");
    allChip.addEventListener("click", () => selectCategoryChip("all"));
    scrollContainer.appendChild(allChip);
    
    // Get unique categories from active products
    const uniqueCats = [...new Set(state.products.map(p => p.category).filter(Boolean))];
    uniqueCats.forEach(cat => {
        const chip = document.createElement("div");
        chip.className = "phone-cat-chip";
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
    let filtered = state.products.filter(p => {
        // Enforce strict business rule: product MUST have a valid associated recipe
        return state.recipes.some(r => r.id === p.recipeId);
    });
    if (activeCategoryFilter !== "all") {
        filtered = filtered.filter(p => p.category === activeCategoryFilter);
    }
    if (activeSearchFilter) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(activeSearchFilter) || (p.desc && p.desc.toLowerCase().includes(activeSearchFilter)) || (p.description && p.description.toLowerCase().includes(activeSearchFilter)));
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 24px; color: #94a3b8;">
                <p>Nenhum doce encontrado. 🧁</p>
            </div>
        `;
        return;
    }
    
    // Render list
    filtered.forEach(p => {
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
        
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div class="phone-prod-emoji" style="font-size: 24px; width: 44px; height: 44px; background: var(--color-primary-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink:0;">
                    ${p.emoji || "🧁"}
                </div>
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
    
    // Sync cart quantity actions
    updateCartUI();
}

function updateCartUI() {
    // 1. Update product cards quantity controls in the active storefront list
    state.products.forEach(p => {
        const actionWrapper = document.getElementById(`prod-action-${p.id}`);
        if (!actionWrapper) return;
        
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
        const p = state.products.find(prod => prod.id === item.productId);
        if (p) {
            totalItems += item.qty;
            totalPrice += item.qty * p.price;
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
            });
        }
    }
    
    // 5. Update checkout totals summary
    const btnDelivery = document.getElementById("btn-toggle-delivery-home");
    const isDeliveryHome = btnDelivery && btnDelivery.classList.contains("active");
    const deliveryFee = isDeliveryHome ? 7.00 : 0.00;
    
    const subtotalEl = document.getElementById("phone-summary-subtotal");
    const deliveryEl = document.getElementById("phone-summary-delivery");
    const totalValEl = document.getElementById("phone-summary-total-val");
    
    if (subtotalEl) subtotalEl.innerText = `R$ ${totalPrice.toFixed(2)}`;
    if (deliveryEl) deliveryEl.innerText = isDeliveryHome ? "R$ 7,00" : "Grátis";
    if (totalValEl) totalValEl.innerText = `R$ ${(totalPrice + deliveryFee).toFixed(2)}`;
}

// Attach delivery change recalculations so toggles update totals instantly!
const btnPickup = document.getElementById("btn-toggle-delivery-pickup");
const btnDelivery = document.getElementById("btn-toggle-delivery-home");
if (btnPickup && btnDelivery) {
    btnPickup.addEventListener("click", () => {
        setTimeout(updateCartUI, 10);
    });
    btnDelivery.addEventListener("click", () => {
        setTimeout(updateCartUI, 10);
    });
}

async function processarEncomendaDigital() {
    const nameVal = document.getElementById("phone-cust-name").value.trim();
    const phoneVal = document.getElementById("phone-cust-phone").value.trim();
    
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
        
        // 1. Criar ou buscar cliente
        if (isSupabaseActive && ownerId) {
            const { data: clientData } = await supabaseClient.from('clientes').insert([{
                id: clientId,
                usuario_id: ownerId,
                name: nameVal,
                phone: phoneVal,
                order_count: 1,
                total_spent: 0
            }]).select();
            if (clientData && clientData.length > 0) clientId = clientData[0].id;
        } else {
            state.clients.push({ id: clientId, name: nameVal, phone: phoneVal, orderCount: 1, totalSpent: 0 });
        }
        
        let subtotal = 0;
        let itemRows = "";
        
        // 2. Inserir Pedidos (Kanban)
        for (const item of customerCart) {
            const p = state.products.find(prod => prod.id === item.productId);
            if (!p) continue;
            
            const itemSubtotal = item.qty * p.price;
            subtotal += itemSubtotal;
            itemRows += `• *${item.qty}x ${p.name}* (${p.emoji || "🧁"}) - R$ ${p.price.toFixed(2)} (Subtotal: R$ ${itemSubtotal.toFixed(2)})\n`;
            
            const orderId = "o_" + Date.now() + "_" + Math.floor(Math.random()*1000);
            const now = new Date();
            
            const orderPayload = {
                id: orderId,
                client_id: clientId,
                product_id: p.id,
                qty: item.qty,
                val: itemSubtotal,
                date: now.toISOString().split('T')[0],
                time: now.toTimeString().split(' ')[0].substring(0, 5),
                status: "Em Produção",
                notes: "Via Cardápio Digital"
            };
            
            if (isSupabaseActive && ownerId) {
                orderPayload.usuario_id = ownerId;
                await supabaseClient.from('pedidos').insert([orderPayload]);
            } else {
                state.orders.push(orderPayload);
            }
            
            // 3. Abater Estoque
            await deductStockForOrder({ productId: p.id, qty: item.qty });
        }
        
        saveToLocalStorage();
        
        // 4. Sucesso e Preparação WhatsApp
        const footerActions = document.getElementById("phone-cart-footer-actions");
        const successActions = document.getElementById("phone-cart-success-actions");
        if (footerActions) footerActions.style.display = "none";
        if (successActions) successActions.style.display = "block";
        
        const waBtn = document.getElementById("btn-phone-whatsapp-success");
        if (waBtn) {
            let msg = `Olá! Acabei de fazer um pedido no cardápio digital de *${state.storeConfig.name || 'ConfeitaAI'}*:\n\n`;
            msg += `*🧁 ITENS DO PEDIDO:*\n${itemRows}\n`;
            msg += `*💰 TOTAL: R$ ${subtotal.toFixed(2)}*\n\n`;
            msg += `*👤 CLIENTE:*\n• Nome: ${nameVal}\n• Telefone: ${phoneVal}\n\n`;
            msg += `Já foi enviado para o seu sistema! Aguardo a confirmação. 🙏✨`;
            
            waBtn.onclick = () => {
                const phoneTarget = state.storeConfig.phone || "";
                const url = `https://api.whatsapp.com/send?phone=${phoneTarget}&text=${encodeURIComponent(msg)}`;
                window.open(url, "_blank");
            };
        }
        
    } catch (err) {
        console.error("Erro ao enviar pedido digital:", err);
        alert("Ocorreu um erro ao processar o pedido. Tente novamente.");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Confirmar Encomenda ✨";
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
        supabaseClient.from('mensagens_cacau').insert([{ id: userMsgId, sender: "user", text: msgText, time: timeStr }]).catch(err => {
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

    // A. INTENT: Financial / Faturamento / Lucro / Saldo
    if (lowerText.includes("fatur") || lowerText.includes("lucro") || lowerText.includes("saldo") || lowerText.includes("financeiro")) {
        const income = state.transactions.filter(t => t.type === "Entrada").reduce((sum, t) => sum + t.val, 0);
        const expense = state.transactions.filter(t => t.type === "Saída").reduce((sum, t) => sum + t.val, 0);
        const profit = income - expense;
        
        reply = `Com certeza! Aqui está o resumo das suas finanças da confeitaria para este mês:

• **Faturamento total (Entradas):** R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• **Gastos operacionais (Saídas):** R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• **Lucro Líquido:** **R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**

${profit >= 0 ? "Você está operando no azul! Parabéns pelas vendas! 💵🍰" : "Atenção: seus custos superaram as vendas neste mês. Recomendo rever a Ficha Técnica das receitas!"}`;
    
    // B. INTENT: Register / Add Client
    } else if (lowerText.includes("cliente") && (lowerText.includes("cadastra") || lowerText.includes("adiciona"))) {
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
                supabaseClient.from('clientes').insert([{ id: newId, name: clientName, phone: phoneStr, order_count: 0, total_spent: 0 }]).catch(err => {
                    console.error("Erro ao cadastrar cliente por voz:", err);
                });
            }
            
            reply = `Feito! Registrei a cliente **${clientName}** na sua lista de contatos com o WhatsApp **${phoneStr}**. Ela já pode fazer encomendas! 👥✨`;
        } else {
            reply = `Gostaria de cadastrar uma cliente? Diga no formato: *"Cacau, adicione a cliente Amanda Lima com WhatsApp 11988887777"*`;
        }

    // C. INTENT: Inventory Low alerts list
    } else if (lowerText.includes("estoque") || lowerText.includes("ingrediente") || lowerText.includes("compras")) {
        const lows = state.ingredients.filter(i => i.qty <= i.min);
        
        if (lows.length === 0) {
            reply = `Excelente notícia! Todos os seus ingredientes estão em quantidades adequadas de estoque. Nenhuma compra imediata necessária! 🧁🎉`;
        } else {
            let listStr = "";
            lows.forEach(l => {
                listStr += `\n• **${l.name}**: Restam apenas ${l.qty}${l.unit} (mínimo exigido: ${l.min}${l.unit})`;
            });
            reply = `Atenção! Você possui **${lows.length} ingrediente(s)** em quantidade crítica no estoque:
${listStr}

Deseja que eu gere uma lista de compras formatada para você enviar ao seu fornecedor? ⚠️🛒`;
        }

    // D. INTENT: Add Order
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
        const dateStr = dateMatch ? `2026-${dateMatch[1].split('/')[1]}-${dateMatch[1].split('/')[0]}` : new Date().toISOString().split('T')[0];

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

        reply = `Maravilha! Cadastrei a encomenda de **1x ${foundProduct.name}** para o dia **${dateMatch ? dateMatch[1] : 'próximo sábado'}** no valor de **R$ ${val.toFixed(2)}** para a cliente **${foundClient.name}**. 

O pedido já foi inserido no Kanban de Encomendas! 🎂🚚`;

    // E. INTENT: Add Product / Doce
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
                description: "Novo produto cadastrado rapidamente via Cacau AI.", // compatibility
                emoji: "🧁"
            };
            
            state.products.push(newProduct);
            saveToLocalStorage();
            
            if (isSupabaseActive) {
                supabaseClient.from('produtos').insert([{
                    id: newId,
                    name: prodName,
                    price: price,
                    category: "Outros",
                    description: "Novo produto cadastrado rapidamente via Cacau AI.",
                    emoji: "🧁"
                }]).catch(err => {
                    console.error("Erro ao cadastrar produto por voz:", err);
                });
            }

            reply = `Tudo pronto! Adicionei o produto **${prodName}** no valor de **R$ ${price.toFixed(2)}** ao seu Cardápio Digital. Já está disponível para os seus clientes verem! 🧁✨`;
        } else {
            reply = `Não consegui captar o nome do doce. Pode me pedir assim: *"Cacau, cadastra o produto Bolo de Nozes por R$ 120"*`;
        }

    // F. FALLBACK: Normal friendly chat
    } else {
        reply = `Desculpe, ainda estou aprendendo comandos complexos! Mas eu posso te ajudar a gerenciar a confeitaria de forma muito simples.

Tente me pedir algo como:
• *"Quais ingredientes estão em estoque baixo?"*
• *"Cadastre a cliente Amanda com celular 11988887777"*
• *"Quanto eu lucrei este mês?"*

O que deseja fazer agora? 🍰😊`;
    }

    const cacauMsgId = "m_" + Date.now();
    const newCacauMsg = { sender: "cacau", text: reply, time: timeStr };

    // 1. Update locally instantly
    state.cacauMessages.push(newCacauMsg);
    saveToLocalStorage();
    renderCacauChat();
    renderActiveTab();

    // 2. Background sync
    if (isSupabaseActive) {
        supabaseClient.from('mensagens_cacau').insert([{ id: cacauMsgId, sender: "cacau", text: reply, time: timeStr }]).catch(err => {
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
    const product = state.products.find(p => p.id === order.productId) || { name: "Produto Excluído", price: 0 };
    
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
    
    doc.text(`${order.qty}x ${product.name}`, 20, 105);
    doc.text(`R$ ${(order.qty * product.price).toFixed(2)}`, 190, 105, null, null, "right");
    
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
        if (o.status === "Em Produção") statusBadgeClass = "badge badge-warning";
        else if (o.status === "Pronto") statusBadgeClass = "badge badge-success";
        else if (o.status === "Entregue") statusBadgeClass = "badge badge-purple";

        listEl.innerHTML += `
            <div class="calendar-detail-order-item">
                <div class="order-item-header">
                    <span class="order-item-prod">${product ? product.emoji : "🧁"} ${o.qty}x ${product ? product.name : "Doce Especial"}</span>
                    <span class="${statusBadgeClass}">${o.status}</span>
                </div>
                <div class="order-item-body">
                    <div>👤 Cliente: <strong>${client ? client.name : "Convidado"}</strong></div>
                    <div>🕒 Horário: <strong>${o.time}</strong></div>
                    ${o.notes ? `<div class="order-item-notes">📝 ${o.notes}</div>` : ""}
                </div>
                <div class="order-item-footer" style="display: flex; gap: 8px;">
                    <span class="order-item-val" style="flex: 1; align-self: center;">Total: R$ ${o.val.toFixed(2)}</span>
                    <button class="btn btn-outline btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="window.openRescheduleModal('${o.id}')">📅 Reagendar</button>
                    <button class="btn btn-outline btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="switchTab('pedidos')">Ver Kanban</button>
                </div>
            </div>
        `;
    });
}

// ==========================================================================
// 10. PAINEL ADM LOGIC & MAINTENANCE OPERATIONS
// ==========================================================================

async function renderAdm() {
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
        const userEmail = getLoggedInUserEmail();
        const isSuperAdmin = userEmail === "naturamixrepresentacoes@gmail.com";
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
    const userEmail = getLoggedInUserEmail();
    if (userEmail !== "naturamixrepresentacoes@gmail.com") {
        alert("Acesso negado. Apenas o Super Admin (NaturaMix) pode gerar dados de teste fictícios.");
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
    const userEmail = getLoggedInUserEmail();
    if (userEmail !== "naturamixrepresentacoes@gmail.com") {
        alert("Acesso negado. Apenas o Super Admin (NaturaMix) pode apagar dados do sistema.");
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
    const listEl = document.getElementById("users-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    const session = localStorage.getItem("confeitaai_session");
    let currentRole = '';
    try { currentRole = JSON.parse(session || '{}').role || ''; } catch(e) {}
    const isSuperAdmin = currentRole === 'Super Admin';

    state.users.forEach(u => {
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

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${u.name}</strong><br><span style="font-size:11px;color:#888;">@${u.username || '—'}</span></td>
                <td><code style="font-size:12px;">${u.email || '—'}</code></td>
                <td style="font-size:12px;color:#64748b;">${lastLogin}</td>
                <td>${planBadge}</td>
                <td>${statusDot} ${u.status || 'Ativo'}</td>
                <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        ${plan !== 'PRO' ? `<button class="btn btn-purple btn-sm" onclick="adminUpgradeToPro('${u.id}')" style="padding:4px 8px;font-size:11px;">→ PRO</button>` : `<button class="btn btn-outline btn-sm" onclick="adminDowngradeToTrial('${u.id}')" style="padding:4px 8px;font-size:11px;color:#f59e0b;">↓ Trial</button>`}
                        <button class="btn btn-outline btn-sm" onclick="toggleUserStatus('${u.id}')" style="padding:4px 8px;font-size:11px;">${u.status === 'Ativo' ? 'Suspender' : 'Ativar'}</button>
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
    const username = usernameInput.value.trim().toLowerCase();
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
        } catch (err) {}
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
        } catch (e) {}
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
        } catch (e) {}
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

function populateStoreForm() {
    const nameEl = document.getElementById("store-name");
    const slugEl = document.getElementById("store-slug");
    const phoneEl = document.getElementById("store-phone");
    const hoursEl = document.getElementById("store-hours");
    const logoEl = document.getElementById("store-logo");
    const descEl = document.getElementById("store-desc");
    
    if (nameEl) nameEl.value = state.storeConfig.name || "";
    if (slugEl) slugEl.value = state.storeConfig.slug || "";
    if (phoneEl) phoneEl.value = state.storeConfig.phone || "";
    if (hoursEl) hoursEl.value = state.storeConfig.hours || "";
    if (logoEl) logoEl.value = state.storeConfig.logo || "";
    if (descEl) descEl.value = state.storeConfig.desc || "";
    
    updateStoreShowcase();
}

function updateGeneratedStoreLink() {
    const slugEl = document.getElementById("store-slug");
    const urlEl = document.getElementById("store-showcase-url");
    if (slugEl && urlEl) {
        let val = slugEl.value.trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9-_]/g, "");
        const origin = window.location.origin + window.location.pathname;
        urlEl.innerText = `${origin}?loja=${val || "sua-loja"}`;
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
    
    if (nameEl) nameEl.innerText = state.storeConfig.name || "Doces da Ju";
    if (hoursEl) hoursEl.innerText = state.storeConfig.hours || "Seg a Sex, 09h às 18h";
    if (descEl) descEl.innerText = state.storeConfig.desc || "Nossos doces e bolos gourmet são produzidos com ingredientes nobres e muito amor.";
    
    if (coverEl && state.storeConfig.banner) {
        coverEl.style.backgroundImage = `url('${state.storeConfig.banner}')`;
        coverEl.style.backgroundSize = "cover";
        coverEl.style.backgroundPosition = "center";
    }
    
    if (urlEl) {
        const slug = state.storeConfig.slug || "docesdaju";
        const origin = window.location.origin + window.location.pathname;
        urlEl.innerText = `${origin}?loja=${slug}`;
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
        document.body.classList.add("theme-dark");
    } else if (theme === "rosegold") {
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

// ============================================================================
// STORE CONFIGURATION UX: Image Upload & Compression + Day Toggles
// ============================================================================

function setupStoreConfigUI() {
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
    selectElement.innerHTML = `<option value="">Nenhuma receita vinculada</option>`;
    state.recipes.forEach(r => {
        const option = document.createElement("option");
        option.value = r.id;
        option.textContent = r.name;
        selectElement.appendChild(option);
    });
    if (selectedValue) {
        selectElement.value = selectedValue;
    }
}

// Function to deduct stock based on the recipe of the ordered product
async function deductStockForOrder(order) {
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
                for (const stockIng of updates) {
                    let query = supabaseClient.from('estoque').update({ qty: stockIng.qty }).eq('id', stockIng.id);
                    if (loggedInUserId) query = query.eq('usuario_id', loggedInUserId);
                    await query;
                }
            } catch (e) {
                console.error("Erro ao sincronizar desconto de estoque:", e);
            }
        }
    }
}
