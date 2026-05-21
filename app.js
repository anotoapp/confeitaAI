/* ==========================================================================
   ConfeitaAI - Secure Backend Engine (Vercel API Proxy + LocalStorage Fallback)
   API Keys are NEVER exposed here. All DB calls go through /api/db
   ========================================================================== */

// 1. Connection Configurations & Feature Flags
let isSupabaseActive = false;

// Secure API proxy — all Supabase credentials live only on the server (Vercel)
async function apiCall(action, table, payload = null, filter = null, orderBy = null) {
    try {
        const res = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, table, payload, filter, orderBy })
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `HTTP ${res.status}`);
        }
        return await res.json();
    } catch (err) {
        console.error(`[apiCall] Erro em ${action} ${table}:`, err);
        throw err;
    }
}

// Check if backend API is reachable on startup
async function initConnection() {
    try {
        const result = await apiCall('select', 'produtos');
        if (result && result.data !== undefined) {
            isSupabaseActive = true;
            console.log('Backend API conectado com sucesso! 🌐');
        }
    } catch (err) {
        console.warn('Backend API não disponível. Usando modo local (LocalStorage) 💾');
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
    cacauMessages: []
};

// Seed Data definition for Local fallback or fresh loads
const seedData = {
    products: [
        { id: "p1", name: "Bolo Red Velvet", price: 150.00, category: "Bolos", desc: "Massa leve de cacau vermelho, recheio cremoso de cream cheese e geleia artesanal de morango.", emoji: "🎂" },
        { id: "p2", name: "Cento de Brigadeiros Gourmet", price: 120.00, category: "Docinhos", desc: "Brigadeiros enrolados na hora com chocolate belga e confeitos nobres.", emoji: "🍫" },
        { id: "p3", name: "Torta de Limão Merengada", price: 85.00, category: "Tortas", desc: "Base de biscoito amanteigado, creme de limão siciliano aveludado e merengue suíço maçaricado.", emoji: "🍓" },
        { id: "p4", name: "Cupcake de Baunilha Frutas Vermelhas", price: 12.00, category: "Cupcakes", desc: "Cupcake macio de baunilha recheado com compota de frutas vermelhas e cobertura de buttercream.", emoji: "🧁" }
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
            yield: 12,
            ingredients: [
                { ingId: "i1", amount: 350 },
                { ingId: "i2", amount: 300 },
                { ingId: "i3", amount: 150 },
                { ingId: "i4", amount: 30 },
                { ingId: "i5", amount: 4 }
            ],
            margin: 200
        }
    ],
    cacauMessages: [
        { sender: "cacau", text: "Olá! Seja muito bem-vinda ao **ConfeitaAI**! Eu sou a **Cacau**, sua assistente inteligente. 🍰", time: "18:50" },
        { sender: "cacau", text: "Estou conectada ao seu banco de dados na nuvem com o **Supabase**! Agora tudo o que você me pedir ficará salvo online de verdade. 🌐", time: "18:51" }
    ]
};

// Local storage backup utilities with safety checks
function saveToLocalStorage() {
    try {
        localStorage.setItem("confeitaai_state", JSON.stringify(state));
    } catch (err) {
        console.error("Erro ao salvar no LocalStorage:", err);
    }
}

function getFromLocalStorage() {
    try {
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
        products: Array.isArray(loadedState.products) ? loadedState.products : [],
        ingredients: Array.isArray(loadedState.ingredients) ? loadedState.ingredients : [],
        clients: Array.isArray(loadedState.clients) ? loadedState.clients : [],
        orders: Array.isArray(loadedState.orders) ? loadedState.orders : [],
        transactions: Array.isArray(loadedState.transactions) ? loadedState.transactions : [],
        recipes: Array.isArray(loadedState.recipes) ? loadedState.recipes : [],
        cacauMessages: Array.isArray(loadedState.cacauMessages) ? loadedState.cacauMessages : []
    };
}


// 2. Load & Sync State (Backend API OR LocalStorage Fallback)
async function loadState() {
    showLoadingIndicator();
    
    // Fallback mode if backend API is inactive or failed to initialize
    if (!isSupabaseActive) {
        console.log("Modo offline/local ativado.");
        const saved = getFromLocalStorage();
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                state = sanitizeAndMergeState(parsed);
            } catch (e) {
                console.error("Erro ao analisar estado salvo, recriando...:", e);
                state = sanitizeAndMergeState(seedData);
                saveToLocalStorage();
            }
        } else {
            state = sanitizeAndMergeState(seedData);
            saveToLocalStorage();
        }
        hideLoadingIndicator();
        renderActiveTab();
        return;
    }

    try {
        // Fetch all tables in parallel via secure backend
        const [
            prodResult,
            clientResult,
            stockResult,
            orderResult,
            transResult,
            recipeResult,
            msgResult
        ] = await Promise.all([
            apiCall('select', 'produtos'),
            apiCall('select', 'clientes'),
            apiCall('select', 'estoque'),
            apiCall('select', 'pedidos'),
            apiCall('select', 'transacoes'),
            apiCall('select', 'receitas'),
            apiCall('select', 'mensagens_cacau', null, null, { column: 'created_at', ascending: true })
        ]);

        const prodData = prodResult.data || [];
        const clientData = clientResult.data || [];
        const stockData = stockResult.data || [];
        const orderData = orderResult.data || [];
        const transData = transResult.data || [];
        const recipeData = recipeResult.data || [];
        const msgData = msgResult.data || [];

        // Map database tables to application state
        state.products = prodData;
        
        state.clients = clientData.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            orderCount: c.order_count || 0,
            totalSpent: parseFloat(c.total_spent) || 0
        }));

        state.ingredients = stockData.map(i => ({
            id: i.id,
            name: i.name,
            qty: parseFloat(i.qty) || 0,
            unit: i.unit,
            min: parseFloat(i.min) || 0,
            price: parseFloat(i.price) || 0
        }));

        state.orders = orderData.map(o => ({
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

        state.transactions = transData.map(t => ({
            id: t.id,
            date: t.date,
            desc: t.desc,
            type: t.type,
            category: t.category,
            val: parseFloat(t.val) || 0
        }));

        state.recipes = recipeData.map(r => ({
            id: r.id,
            name: r.name,
            yield: r.yield,
            ingredients: r.ingredients || [],
            margin: parseFloat(r.margin) || 0
        }));

        state.cacauMessages = msgData.map(m => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            time: m.time
        }));

        // If mensagens_cacau are empty on fresh project, auto-seed them
        if (state.cacauMessages.length === 0) {
            const initialMsgs = [
                { id: "m1", sender: "cacau", text: "Olá! Seja muito bem-vinda ao **ConfeitaAI**! Eu sou a **Cacau**, sua assistente inteligente. 🍰", time: "18:50" },
                { id: "m2", sender: "cacau", text: "Estou conectada ao seu banco de dados na nuvem com segurança total! Agora tudo o que você me pedir ficará salvo online de verdade. 🌐", time: "18:51" }
            ];
            for (const m of initialMsgs) {
                await apiCall('insert', 'mensagens_cacau', { id: m.id, sender: m.sender, text: m.text, time: m.time });
            }
            state.cacauMessages = initialMsgs;
        }

    } catch (err) {
        console.error("Falha de conexão com o Backend, ativando fallback local:", err);
        isSupabaseActive = false;
        
        const saved = getFromLocalStorage();
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                state = sanitizeAndMergeState(parsed);
            } catch (e) {
                state = sanitizeAndMergeState(seedData);
            }
        } else {
            state = sanitizeAndMergeState(seedData);
        }
    } finally {
        hideLoadingIndicator();
        renderActiveTab();
    }
}

function renderActiveTab() {
    const currentActiveTab = document.querySelector(".sidebar-menu a.active, .cacau-shortcut-btn.active")?.getAttribute("data-tab") || "dashboard";
    switchTab(currentActiveTab);
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
        loader.style.display = "flex";
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
    loader.style.display = "flex";
}

function hideLoadingIndicator() {
    // Keep visible to show status (Supabase Online or Local Mode) but remove rotating spinner
    const loader = document.getElementById("db-sync-indicator");
    if (loader) {
        loader.innerHTML = isSupabaseActive 
            ? `🟢 Supabase Conectado`
            : `💾 Armazenamento Local`;
        loader.style.backgroundColor = isSupabaseActive ? "var(--color-success)" : "var(--color-text-muted)";
    }
}

// 4. Tab Routing System
function switchTab(tabId) {
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
            if (headerSubtitle) headerSubtitle.innerText = "Acompanhe o desempenho da sua confeitaria hoje";
            try {
                renderDashboard();
            } catch (e) {
                console.error("Erro ao renderizar Painel Geral:", e);
            }
            break;
        case "cardapio":
            if (headerTitle) headerTitle.innerText = "Cardápio Digital";
            if (headerSubtitle) headerSubtitle.innerText = "Seus deliciosos doces cadastrados e vitrine pública";
            try {
                renderCardapio();
            } catch (e) {
                console.error("Erro ao renderizar Cardápio Digital:", e);
            }
            break;
        case "pedidos":
            if (headerTitle) headerTitle.innerText = "Pedidos & Kanban";
            if (headerSubtitle) headerSubtitle.innerText = "Monitore o preparo e a entrega das suas encomendas";
            try {
                renderPedidos();
            } catch (e) {
                console.error("Erro ao renderizar Pedidos & Kanban:", e);
            }
            break;
        case "estoque":
            if (headerTitle) headerTitle.innerText = "Estoque Inteligente";
            if (headerSubtitle) headerSubtitle.innerText = "Mantenha o controle de matéria-prima e evite prejuízos";
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
            if (headerTitle) headerTitle.innerText = "Receitas & Ficha Técnica";
            if (headerSubtitle) headerSubtitle.innerText = "Calcule o custo exato de cada porção e sugira margem de lucro";
            try {
                renderReceitas();
            } catch (e) {
                console.error("Erro ao renderizar Receitas & Ficha Técnica:", e);
            }
            break;
        case "financeiro":
            if (headerTitle) headerTitle.innerText = "Financeiro Completo";
            if (headerSubtitle) headerSubtitle.innerText = "Fluxo de caixa, lucros líquidos e relatórios visuais";
            try {
                renderFinanceiro();
            } catch (e) {
                console.error("Erro ao renderizar Financeiro Completo:", e);
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
        const modalTitle = document.getElementById("product-modal-title");
        if (modalTitle) modalTitle.innerText = "Adicionar Novo Produto";
        openModal("modal-product");
    });
    safeBind("btn-add-ingredient", "click", () => openModal("modal-ingredient"));
    safeBind("btn-add-client", "click", () => openModal("modal-client"));
    safeBind("btn-new-order", "click", () => openModal("modal-order"));
    safeBind("btn-create-recipe", "click", () => openModal("modal-recipe"));
    safeBind("btn-add-transaction", "click", () => openModal("modal-transaction"));
    safeBind("btn-preview-menu", "click", openMenuPreview);

    // AI Tip Action in dashboard
    safeBind("btn-tip-list-compras", "click", () => {
        switchTab("cacau-chat");
        sendCacauCommand("Cacau, quais ingredientes estão em estoque baixo?");
    });

    // Bind Modals close actions
    document.querySelectorAll(".close-btn").forEach(el => {
        el.addEventListener("click", () => {
            closeModal(el.getAttribute("data-modal"));
        });
    });

    // Form Submissions
    safeBind("form-product", "submit", handleProductSubmit);
    safeBind("form-ingredient", "submit", handleIngredientSubmit);
    safeBind("form-client", "submit", handleClientSubmit);
    safeBind("form-order", "submit", handleOrderSubmit);
    safeBind("form-transaction", "submit", handleTransactionSubmit);
    safeBind("form-recipe", "submit", handleRecipeSubmit);

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

    // Run async load state after bindings
    initConnection().then(() => {
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
    const totalBilling = state.transactions
        .filter(t => t.type === "Entrada")
        .reduce((sum, t) => sum + t.val, 0);
    
    document.getElementById("dash-billing").innerText = `R$ ${totalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById("dash-orders-count").innerText = state.orders.length;
    
    const pendingOrdersCount = state.orders.filter(o => o.status !== "Entregue").length;
    document.getElementById("dash-orders-pending").innerText = `${pendingOrdersCount} pendentes`;
    
    document.getElementById("dash-clients-count").innerText = state.clients.length;

    let stockAlertsCount = 0;
    state.ingredients.forEach(i => {
        if (i.qty <= i.min) {
            stockAlertsCount++;
        }
    });

    const alertCard = document.getElementById("dash-stock-alert-card");
    const stockBadge = document.getElementById("dash-stock-alerts");
    const stockMsg = document.getElementById("dash-stock-msg");
    
    stockBadge.innerText = `${stockAlertsCount} itens`;
    
    if (stockAlertsCount > 0) {
        alertCard.style.display = "flex";
        stockMsg.innerText = "Ingredientes perto do fim!";
    } else {
        alertCard.style.display = "flex";
        stockMsg.innerText = "Tudo adequado ✨";
    }

    const urgentDiv = document.getElementById("dash-urgent-orders");
    urgentDiv.innerHTML = "";
    
    const activeOrders = state.orders
        .filter(o => o.status !== "Entregue")
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (activeOrders.length === 0) {
        urgentDiv.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma encomenda pendente! ✨</p>
            </div>
        `;
    } else {
        activeOrders.forEach(o => {
            const client = state.clients.find(c => c.id === o.clientId);
            const product = state.products.find(p => p.id === o.productId);
            const rawDate = new Date(o.date + "T00:00:00");
            const formattedDate = rawDate.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
            
            const isToday = new Date().toDateString() === rawDate.toDateString();
            const urgencyClass = isToday ? 'compact-order-date' : 'badge badge-warning';

            urgentDiv.innerHTML += `
                <div class="compact-order-item">
                    <div class="compact-order-info">
                        <span class="compact-order-title">${product ? product.emoji : "🧁"} ${o.qty}x ${product ? product.name : "Doce Especial"}</span>
                        <span class="compact-order-client">Cliente: ${client ? client.name : "Convidado"} (${o.time})</span>
                    </div>
                    <div class="action-flex">
                        <span class="${urgencyClass}">${isToday ? 'Hoje' : formattedDate}</span>
                        <span class="badge" style="margin-left: 10px;">${o.status}</span>
                    </div>
                </div>
            `;
        });
    }
}

// B. CARDAPIO VIEW
function renderCardapio(searchQuery = "") {
    const list = document.getElementById("products-list");
    list.innerHTML = "";

    const filtered = state.products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <div class="kanban-card-actions">
                    ${o.status !== "Recebido" ? `<button class="btn btn-outline btn-sm" onclick="moveOrderStatus('${o.id}', 'prev')">←</button>` : ''}
                    <button class="btn btn-outline btn-sm" style="color:var(--color-danger)" onclick="deleteOrder('${o.id}')">X</button>
                    ${o.status !== "Entregue" ? `<button class="btn btn-outline btn-sm" onclick="moveOrderStatus('${o.id}', 'next')">→</button>` : ''}
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
function renderReceitas(searchQuery = "") {
    const list = document.getElementById("recipes-list");
    list.innerHTML = "";

    const filtered = state.recipes.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <p>Nenhuma receita inteligente cadastrada. Crie uma para calcular margens! 🔬</p>
            </div>
        `;
        return;
    }

    filtered.forEach(r => {
        let totalCost = 0;
        r.ingredients.forEach(ri => {
            const ing = state.ingredients.find(i => i.id === ri.ingId);
            if (ing) {
                totalCost += (ing.price / 1000) * ri.amount;
            }
        });

        const suggestedPrice = totalCost * (1 + r.margin / 100);
        const pricePerSlice = suggestedPrice / r.yield;

        list.innerHTML += `
            <div class="recipe-card">
                <div class="recipe-header">
                    <div>
                        <h3>${r.name}</h3>
                        <span class="badge badge-purple" style="margin-top:4px;">${r.ingredients.length} Ingredientes</span>
                    </div>
                    <span class="badge badge-success">Rendimento: ${r.yield} fatias</span>
                </div>
                <div class="recipe-cost-breakdown">
                    <div>
                        <span class="recipe-cost-label">Custo Produção</span>
                        <div class="recipe-cost-value">R$ ${totalCost.toFixed(2)}</div>
                    </div>
                    <div style="text-align: right;">
                        <span class="recipe-cost-label" style="color: var(--color-purple)">Venda por Fatia</span>
                        <div class="recipe-cost-value" style="color: var(--color-purple)">R$ ${pricePerSlice.toFixed(2)}</div>
                    </div>
                </div>
                <div class="recipe-meta">
                    <span>Markup: <strong>${r.margin}%</strong></span>
                    <span>Preço Total Recomendado: <strong>R$ ${suggestedPrice.toFixed(2)}</strong></span>
                </div>
                <div class="recipe-actions">
                    <button class="btn btn-outline btn-sm" onclick="exportRecipeToProduct('${r.id}', ${suggestedPrice})">Exportar p/ Cardápio 📤</button>
                    <button class="btn btn-outline btn-sm" style="color:var(--color-danger)" onclick="deleteRecipe('${r.id}')">Excluir</button>
                </div>
            </div>
        `;
    });
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
    const maxVal = Math.max(income, expense, 100);
    const incHeight = (income / maxVal) * 160;
    const expHeight = (expense / maxVal) * 160;

    box.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 300 220" style="display: block;">
            <line x1="40" y1="20" x2="280" y2="20" stroke="#f1f5f9" stroke-width="1" />
            <line x1="40" y1="100" x2="280" y2="100" stroke="#f1f5f9" stroke-width="1" />
            <line x1="40" y1="180" x2="280" y2="180" stroke="#cbd5e1" stroke-width="2" />
            
            <text x="35" y="185" fill="#6e768e" font-size="10" text-anchor="end">R$ 0</text>
            <text x="35" y="105" fill="#6e768e" font-size="10" text-anchor="end">R$ ${(maxVal/2).toFixed(0)}</text>
            <text x="35" y="25" fill="#6e768e" font-size="10" text-anchor="end">R$ ${maxVal.toFixed(0)}</text>

            <rect x="75" y="${180 - incHeight}" width="50" height="${incHeight}" fill="url(#grad-income)" rx="6" />
            <text x="100" y="${175 - incHeight}" fill="#10b981" font-weight="700" font-size="11" text-anchor="middle">R$ ${income.toFixed(0)}</text>
            <text x="100" y="198" fill="#2d3142" font-size="11" font-weight="600" text-anchor="middle">Receitas</text>

            <rect x="175" y="${180 - expHeight}" width="50" height="${expHeight}" fill="url(#grad-expense)" rx="6" />
            <text x="200" y="${175 - expHeight}" fill="#ef4444" font-weight="700" font-size="11" text-anchor="middle">R$ ${expense.toFixed(0)}</text>
            <text x="200" y="198" fill="#2d3142" font-size="11" font-weight="600" text-anchor="middle">Despesas</text>

            <defs>
                <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#34d399" />
                    <stop offset="100%" stop-color="#10b981" />
                </linearGradient>
                <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#fca5a5" />
                    <stop offset="100%" stop-color="#ef4444" />
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

    if (isSupabaseActive) {
        if (id) {
            await apiCall('update', 'produtos', { name, price, category, description: desc, emoji }, { column: 'id', value: id });
        } else {
            const newId = "p_" + Date.now();
            await apiCall('insert', 'produtos', { id: newId, name, price, category, description: desc, emoji });
        }
    } else {
        if (id) {
            const idx = state.products.findIndex(p => p.id === id);
            if (idx !== -1) state.products[idx] = { id, name, price, category, desc, emoji };
        } else {
            const newId = "p_" + Date.now();
            state.products.push({ id: newId, name, price, category, desc, emoji });
        }
        saveToLocalStorage();
    }

    closeModal("modal-product");
    await loadState();
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

    document.getElementById("product-modal-title").innerText = "Editar Produto";
    openModal("modal-product");
}

async function deleteProduct(id) {
    if (confirm("Deseja realmente excluir este produto? Isso não afetará os pedidos já registrados.")) {
        if (isSupabaseActive) {
            await apiCall('delete', 'produtos', null, { column: 'id', value: id });
        } else {
            state.products = state.products.filter(p => p.id !== id);
            saveToLocalStorage();
        }
        await loadState();
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

    if (isSupabaseActive) {
        await apiCall('insert', 'estoque', { id: newId, name, qty, unit, min, price });
    } else {
        state.ingredients.push({ id: newId, name, qty, unit, min, price });
        saveToLocalStorage();
    }

    closeModal("modal-ingredient");
    document.getElementById("form-ingredient").reset();
    await loadState();
}

async function quickAddStock(id) {
    const ing = state.ingredients.find(i => i.id === id);
    if (!ing) return;

    const addVal = prompt(`Quantos (${ing.unit}) de ${ing.name} você comprou para adicionar ao estoque?`, "1000");
    const num = parseFloat(addVal);
    if (isNaN(num) || num <= 0) return;

    const newQty = ing.qty + num;
    const expense = num * (ing.price / 1000);

    if (isSupabaseActive) {
        await Promise.all([
            apiCall('update', 'estoque', { qty: newQty }, { column: 'id', value: id }),
            apiCall('insert', 'transacoes', {
                id: "t_" + Date.now(),
                date: new Date().toISOString().split('T')[0],
                desc: `Estoque: +${num}${ing.unit} de ${ing.name}`,
                type: "Saída",
                category: "Ingredientes",
                val: expense
            })
        ]);
    } else {
        ing.qty = newQty;
        state.transactions.push({
            id: "t_" + Date.now(),
            date: new Date().toISOString().split('T')[0],
            desc: `Estoque: +${num}${ing.unit} de ${ing.name}`,
            type: "Saída",
            category: "Ingredientes",
            val: expense
        });
        saveToLocalStorage();
    }

    await loadState();
}

async function deleteIngredient(id) {
    if (confirm("Tem certeza que deseja remover este ingrediente?")) {
        if (isSupabaseActive) {
            await apiCall('delete', 'estoque', null, { column: 'id', value: id });
        } else {
            state.ingredients = state.ingredients.filter(i => i.id !== id);
            saveToLocalStorage();
        }
        await loadState();
    }
}

// C. Client CRUD
async function handleClientSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("cli-name").value;
    const phone = document.getElementById("cli-phone").value.replace(/\D/g, "");

    const newId = "c_" + Date.now();

    if (isSupabaseActive) {
        await apiCall('insert', 'clientes', { id: newId, name, phone, order_count: 0, total_spent: 0 });
    } else {
        state.clients.push({ id: newId, name, phone, orderCount: 0, totalSpent: 0 });
        saveToLocalStorage();
    }

    closeModal("modal-client");
    document.getElementById("form-client").reset();
    await loadState();
}

async function deleteClient(id) {
    if (confirm("Deseja realmente excluir este cliente?")) {
        if (isSupabaseActive) {
            await apiCall('delete', 'clientes', null, { column: 'id', value: id });
        } else {
            state.clients = state.clients.filter(c => c.id !== id);
            saveToLocalStorage();
        }
        await loadState();
    }
}

// D. Order CRUD
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

    if (isSupabaseActive) {
        await apiCall('insert', 'pedidos', {
            id: newId,
            client_id: clientId,
            product_id: productId,
            qty: qty,
            val: val,
            date: date,
            time: time + ":00",
            status: "Recebido",
            notes: notes
        });

        const client = state.clients.find(c => c.id === clientId);
        if (client) {
            const newCount = client.orderCount + 1;
            const newSpent = client.totalSpent + val;
            await apiCall('update', 'clientes', { order_count: newCount, total_spent: newSpent }, { column: 'id', value: clientId });
        }
    } else {
        state.orders.push({ id: newId, clientId, productId, qty, val, date, time, status: "Recebido", notes });
        const client = state.clients.find(c => c.id === clientId);
        if (client) {
            client.orderCount++;
            client.totalSpent += val;
        }
        saveToLocalStorage();
    }

    closeModal("modal-order");
    document.getElementById("form-order").reset();
    await loadState();
}

async function deleteOrder(id) {
    if (confirm("Remover esta encomenda do sistema?")) {
        const order = state.orders.find(o => o.id === id);
        if (order) {
            const client = state.clients.find(c => c.id === order.clientId);
            if (client) {
                const newCount = Math.max(0, client.orderCount - 1);
                const newSpent = Math.max(0, client.totalSpent - order.val);
                
                if (isSupabaseActive) {
                    await apiCall('update', 'clientes', { order_count: newCount, total_spent: newSpent }, { column: 'id', value: order.clientId });
                } else {
                    client.orderCount = newCount;
                    client.totalSpent = newSpent;
                }
            }
        }

        if (isSupabaseActive) {
            await apiCall('delete', 'pedidos', null, { column: 'id', value: id });
        } else {
            state.orders = state.orders.filter(o => o.id !== id);
            saveToLocalStorage();
        }
        await loadState();
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
        
        if (isSupabaseActive) {
            await apiCall('update', 'pedidos', { status: nextStatus }, { column: 'id', value: id });
            if (nextStatus === "Entregue") {
                const prod = state.products.find(p => p.id === order.productId);
                const client = state.clients.find(c => c.id === order.clientId);
                await apiCall('insert', 'transacoes', {
                    id: "t_" + Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    desc: `Entrega: ${prod ? prod.name : 'Doce'} - Cliente: ${client ? client.name : 'Convidado'} (Pedido: ${order.id})`,
                    type: "Entrada",
                    category: "Vendas",
                    val: order.val
                });
            }
        } else {
            order.status = nextStatus;
            if (nextStatus === "Entregue") {
                const prod = state.products.find(p => p.id === order.productId);
                const client = state.clients.find(c => c.id === order.clientId);
                state.transactions.push({
                    id: "t_" + Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    desc: `Entrega: ${prod ? prod.name : 'Doce'} - Cliente: ${client ? client.name : 'Convidado'}`,
                    type: "Entrada",
                    category: "Vendas",
                    val: order.val
                });
            }
            saveToLocalStorage();
        }
    } else if (direction === "prev" && currIdx > 0) {
        const prevStatus = stages[currIdx - 1];

        if (isSupabaseActive) {
            await apiCall('update', 'pedidos', { status: prevStatus }, { column: 'id', value: id });
            if (order.status === "Entregue") {
                await apiCall('delete', 'transacoes', null, { column: 'desc', value: `%Pedido: ${order.id}%`, operator: 'like' });
            }
        } else {
            if (order.status === "Entregue") {
                state.transactions = state.transactions.filter(t => 
                    !(t.type === "Entrada" && t.val === order.val)
                );
            }
            order.status = prevStatus;
            saveToLocalStorage();
        }
    }

    await loadState();
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

        if (isSupabaseActive) {
            await apiCall('update', 'pedidos', { status: targetStatus }, { column: 'id', value: orderId });

            if (targetStatus === "Entregue" && !wasEntregue) {
                const prod = state.products.find(p => p.id === order.productId);
                const client = state.clients.find(c => c.id === order.clientId);
                await apiCall('insert', 'transacoes', {
                    id: "t_" + Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    desc: `Entrega: ${prod ? prod.name : 'Doce'} - Cliente: ${client ? client.name : 'Convidado'} (Pedido: ${order.id})`,
                    type: "Entrada",
                    category: "Vendas",
                    val: order.val
                });
            } else if (wasEntregue && targetStatus !== "Entregue") {
                await apiCall('delete', 'transacoes', null, { column: 'desc', value: `%Pedido: ${order.id}%`, operator: 'like' });
            }
        } else {
            order.status = targetStatus;
            if (targetStatus === "Entregue" && !wasEntregue) {
                const prod = state.products.find(p => p.id === order.productId);
                const client = state.clients.find(c => c.id === order.clientId);
                state.transactions.push({
                    id: "t_" + Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    desc: `Entrega: ${prod ? prod.name : 'Doce'} - Cliente: ${client ? client.name : 'Convidado'}`,
                    type: "Entrada",
                    category: "Vendas",
                    val: order.val
                });
            } else if (wasEntregue && targetStatus !== "Entregue") {
                state.transactions = state.transactions.filter(t => 
                    !(t.type === "Entrada" && t.val === order.val)
                );
            }
            saveToLocalStorage();
        }

        await loadState();
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

    if (isSupabaseActive) {
        await apiCall('insert', 'transacoes', { id: newId, desc, type, val, category, date });
    } else {
        state.transactions.push({ id: newId, desc, type, val, category, date });
        saveToLocalStorage();
    }

    closeModal("modal-transaction");
    document.getElementById("form-transaction").reset();
    await loadState();
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
    let totalCost = 0;

    rows.forEach(row => {
        const ingId = row.querySelector(".recipe-ing-select").value;
        const amt = parseFloat(row.querySelector(".recipe-ing-qty").value) || 0;
        
        if (ingId) {
            const ing = state.ingredients.find(i => i.id === ingId);
            if (ing) {
                totalCost += (ing.price / 1000) * amt;
            }
        }
    });

    document.getElementById("rec-cost-calculated").innerText = `R$ ${totalCost.toFixed(2)}`;

    const yieldCount = parseInt(document.getElementById("rec-yield").value) || 1;
    const margin = parseFloat(document.getElementById("rec-margin").value) || 0;
    
    const suggestedPrice = totalCost * (1 + margin / 100);
    const sugSlice = suggestedPrice / yieldCount;

    document.getElementById("rec-suggested-slice").innerText = `R$ ${sugSlice.toFixed(2)}`;
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

    if (isSupabaseActive) {
        await apiCall('insert', 'receitas', { id: newId, name, yield: yieldCount, ingredients, margin });
    } else {
        state.recipes.push({ id: newId, name, yield: yieldCount, ingredients, margin });
        saveToLocalStorage();
    }

    closeModal("modal-recipe");
    await loadState();
}

async function deleteRecipe(id) {
    if (confirm("Excluir esta ficha técnica de receita?")) {
        if (isSupabaseActive) {
            await apiCall('delete', 'receitas', null, { column: 'id', value: id });
        } else {
            state.recipes = state.recipes.filter(r => r.id !== id);
            saveToLocalStorage();
        }
        await loadState();
    }
}

async function exportRecipeToProduct(recipeId, suggestedPrice) {
    const r = state.recipes.find(recipe => recipe.id === recipeId);
    if (!r) return;

    const newProdId = "p_" + Date.now();

    if (isSupabaseActive) {
        await apiCall('insert', 'produtos', {
            id: newProdId,
            name: r.name,
            price: parseFloat(suggestedPrice.toFixed(2)),
            category: "Bolos",
            description: `Receita artesanal inteligente exportada diretamente da Ficha Técnica. Rendimento de ${r.yield} fatias.`,
            emoji: "🎂"
        });
    } else {
        state.products.push({
            id: newProdId,
            name: r.name,
            price: parseFloat(suggestedPrice.toFixed(2)),
            category: "Bolos",
            desc: `Receita artesanal inteligente exportada diretamente da Ficha Técnica. Rendimento de ${r.yield} fatias.`,
            emoji: "🎂"
        });
        saveToLocalStorage();
    }

    await loadState();
    alert(`Receita "${r.name}" exportada para o seu Cardápio com sucesso no valor de R$ ${suggestedPrice.toFixed(2)}!`);
    switchTab("cardapio");
}

// Customer Store Menu Preview Simulator
function openMenuPreview() {
    const phoneBody = document.getElementById("phone-menu-body");
    phoneBody.innerHTML = "";

    if (state.products.length === 0) {
        phoneBody.innerHTML = `
            <div class="empty-state">
                <p>Nenhum doce cadastrado no cardápio público.</p>
            </div>
        `;
    } else {
        const categories = [...new Set(state.products.map(p => p.category))];
        
        categories.forEach(cat => {
            phoneBody.innerHTML += `<div class="phone-category-title">${cat}</div>`;
            
            const catProducts = state.products.filter(p => p.category === cat);
            catProducts.forEach(p => {
                phoneBody.innerHTML += `
                    <div class="phone-product-card">
                        <div class="phone-prod-emoji">${p.emoji}</div>
                        <div class="phone-prod-details">
                            <div class="phone-prod-name">${p.name}</div>
                            <p style="font-size:10px; color:#6e768e; margin-top:2px;">${p.desc || p.description || ''}</p>
                            <div class="phone-prod-price">R$ ${p.price.toFixed(2)}</div>
                        </div>
                    </div>
                `;
            });
        });
    }

    openModal("modal-menu-preview");
}


// ================= 8. CACAU WHATSAPP SIMULATOR ENGINE (AI INTEGRATION) =================

async function handleWaSend() {
    const input = document.getElementById("wa-message-input");
    const msgText = input.value.trim();
    if (!msgText) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (isSupabaseActive) {
        const userMsgId = "m_" + Date.now();
        await apiCall('insert', 'mensagens_cacau', { id: userMsgId, sender: "user", text: msgText, time: timeStr });
    } else {
        state.cacauMessages.push({ sender: "user", text: msgText, time: timeStr });
        saveToLocalStorage();
    }

    input.value = "";
    await loadState();

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
            
            if (isSupabaseActive) {
                await apiCall('insert', 'clientes', { id: newId, name: clientName, phone: phoneStr, order_count: 0, total_spent: 0 });
            } else {
                state.clients.push({ id: newId, name: clientName, phone: phoneStr, orderCount: 0, totalSpent: 0 });
                saveToLocalStorage();
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
        
        if (isSupabaseActive) {
            await apiCall('insert', 'pedidos', {
                id: newId,
                client_id: foundClient.id,
                product_id: foundProduct.id,
                qty: 1,
                val: val,
                date: dateStr,
                time: "16:00:00",
                status: "Recebido",
                notes: "Encomenda cadastrada por comando de voz via Cacau AI."
            });

            const newCount = foundClient.orderCount + 1;
            const newSpent = foundClient.totalSpent + val;
            await apiCall('update', 'clientes', { order_count: newCount, total_spent: newSpent }, { column: 'id', value: foundClient.id });
        } else {
            state.orders.push({
                id: newId,
                clientId: foundClient.id,
                productId: foundProduct.id,
                qty: 1,
                val: val,
                date: dateStr,
                time: "16:00",
                status: "Recebido",
                notes: "Encomenda cadastrada por comando de voz via Cacau AI."
            });
            foundClient.orderCount++;
            foundClient.totalSpent += val;
            saveToLocalStorage();
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
            
            if (isSupabaseActive) {
                await apiCall('insert', 'produtos', {
                    id: newId,
                    name: prodName,
                    price: price,
                    category: "Outros",
                    description: "Novo produto cadastrado rapidamente via Cacau AI.",
                    emoji: "🧁"
                });
            } else {
                state.products.push({
                    id: newId,
                    name: prodName,
                    price: price,
                    category: "Outros",
                    desc: "Novo produto cadastrado rapidamente via Cacau AI.",
                    emoji: "🧁"
                });
                saveToLocalStorage();
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

    if (isSupabaseActive) {
        const cacauMsgId = "m_" + Date.now();
        await apiCall('insert', 'mensagens_cacau', { id: cacauMsgId, sender: "cacau", text: reply, time: timeStr });
    } else {
        state.cacauMessages.push({ sender: "cacau", text: reply, time: timeStr });
        saveToLocalStorage();
    }

    await loadState();
}


// ================= 9. CALENDAR ENGINE =================

let calendarState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-indexed
    selectedDate: null
};

const MONTHS_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function renderCalendar() {
    const { year, month, selectedDate } = calendarState;

    const monthLabel = document.getElementById("calendar-current-month");
    if (monthLabel) monthLabel.textContent = `${MONTHS_PT[month]} ${year}`;

    const grid = document.getElementById("calendar-days-grid");
    if (!grid) return;
    grid.innerHTML = "";

    // Map orders by date string "YYYY-MM-DD"
    const ordersByDate = {};
    state.orders.forEach(o => {
        if (!o.date) return;
        if (!ordersByDate[o.date]) ordersByDate[o.date] = [];
        ordersByDate[o.date].push(o);
    });

    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Empty cells before first day of month
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "cal-day empty";
        grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOrders = ordersByDate[dateStr] || [];

        const cell = document.createElement("div");
        cell.className = "cal-day";
        if (dateStr === todayStr) cell.classList.add("today");
        if (selectedDate === dateStr) cell.classList.add("selected");
        if (dayOrders.length > 0) cell.classList.add("has-orders");

        cell.innerHTML = `<span class="cal-day-num">${d}</span>`;

        if (dayOrders.length > 0) {
            const dotsWrapper = document.createElement("div");
            dotsWrapper.className = "cal-dots";
            const dotsToShow = Math.min(dayOrders.length, 3);
            for (let x = 0; x < dotsToShow; x++) {
                const dot = document.createElement("span");
                dot.className = "cal-dot";
                const o = dayOrders[x];
                if (o.status === "Entregue")         dot.classList.add("dot-entregue");
                else if (o.status === "Pronto")       dot.classList.add("dot-pronto");
                else if (o.status === "Em Produção")  dot.classList.add("dot-producao");
                else                                  dot.classList.add("dot-recebido");
                dotsWrapper.appendChild(dot);
            }
            if (dayOrders.length > 3) {
                const more = document.createElement("span");
                more.className = "cal-dot-more";
                more.textContent = `+${dayOrders.length - 3}`;
                dotsWrapper.appendChild(more);
            }
            cell.appendChild(dotsWrapper);
        }

        cell.addEventListener("click", () => {
            calendarState.selectedDate = dateStr;
            renderCalendar();
            renderCalendarDayDetails(dateStr, dayOrders);
        });

        grid.appendChild(cell);
    }

    if (selectedDate) {
        const orders = ordersByDate[selectedDate] || [];
        renderCalendarDayDetails(selectedDate, orders);
    }
}

function renderCalendarDayDetails(dateStr, dayOrders) {
    const title = document.getElementById("calendar-details-title");
    const list = document.getElementById("calendar-details-list");
    if (!title || !list) return;

    const [yr, mo, dy] = dateStr.split("-");
    const dateObj = new Date(parseInt(yr), parseInt(mo) - 1, parseInt(dy));
    const dateFormatted = dateObj.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    title.textContent = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

    if (dayOrders.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma encomenda agendada para este dia 🍰</p>
            </div>
        `;
        return;
    }

    list.innerHTML = "";
    dayOrders.forEach(o => {
        const client = state.clients.find(c => c.id === o.clientId);
        const product = state.products.find(p => p.id === o.productId);

        const statusMeta = {
            "Recebido":     { bg: "#f1f5f9", color: "#6e768e" },
            "Em Produção":  { bg: "#fffbeb", color: "#d97706" },
            "Pronto":       { bg: "#ecfdf5", color: "#059669" },
            "Entregue":     { bg: "#f5f3ff", color: "#7c3aed" }
        };
        const sm = statusMeta[o.status] || statusMeta["Recebido"];
        const notesSnippet = o.notes ? ` · 📝 ${o.notes.substring(0, 38)}${o.notes.length > 38 ? '…' : ''}` : '';

        list.innerHTML += `
            <div class="cal-detail-item">
                <div class="cal-detail-emoji">${product ? product.emoji : "🧁"}</div>
                <div class="cal-detail-body">
                    <div class="cal-detail-title">${o.qty}x ${product ? product.name : "Doce Especial"}</div>
                    <div class="cal-detail-client">👤 ${client ? client.name : "Cliente"}</div>
                    <div class="cal-detail-time">⏰ ${o.time || "—"}${notesSnippet}</div>
                </div>
                <div class="cal-detail-right">
                    <span class="cal-status-badge" style="background:${sm.bg}; color:${sm.color}">${o.status}</span>
                    <span class="cal-detail-val">R$ ${o.val.toFixed(2)}</span>
                </div>
            </div>
        `;
    });
}

function initCalendarControls() {
    const prevBtn = document.getElementById("btn-prev-month");
    const nextBtn = document.getElementById("btn-next-month");

    if (prevBtn && !prevBtn._calBound) {
        prevBtn._calBound = true;
        prevBtn.addEventListener("click", () => {
            calendarState.month--;
            if (calendarState.month < 0) { calendarState.month = 11; calendarState.year--; }
            calendarState.selectedDate = null;
            renderCalendar();
            resetCalendarDetails();
        });
    }

    if (nextBtn && !nextBtn._calBound) {
        nextBtn._calBound = true;
        nextBtn.addEventListener("click", () => {
            calendarState.month++;
            if (calendarState.month > 11) { calendarState.month = 0; calendarState.year++; }
            calendarState.selectedDate = null;
            renderCalendar();
            resetCalendarDetails();
        });
    }
}

function resetCalendarDetails() {
    const title = document.getElementById("calendar-details-title");
    const list = document.getElementById("calendar-details-list");
    if (title) title.textContent = "Selecione um dia no calendário";
    if (list) list.innerHTML = `<div class="empty-state"><p>Selecione um dia com encomendas para ver os detalhes da entrega! 🍰</p></div>`;
}

// Patch renderDashboard to also trigger calendar rendering
const _origRenderDashboard = renderDashboard;
renderDashboard = function() {
    _origRenderDashboard();
    initCalendarControls();
    renderCalendar();
};
