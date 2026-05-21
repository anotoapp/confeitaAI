// ==========================================================================
//  ConfeitaAI - Vercel Serverless API (Backend Proxy)
//  This function is the ONLY place that holds Supabase credentials.
//  The frontend never has access to these keys.
// ==========================================================================

const { createClient } = require('@supabase/supabase-js');

// Keys are read from Vercel Environment Variables (never exposed to the browser)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async function handler(req, res) {
    // Allow requests from the same origin (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, table, payload, filter, orderBy } = req.body || {};

    if (!action || !table) {
        return res.status(400).json({ error: 'Parâmetros "action" e "table" são obrigatórios.' });
    }

    // Whitelist of allowed tables for security
    const allowedTables = ['produtos', 'clientes', 'estoque', 'pedidos', 'transacoes', 'receitas', 'mensagens_cacau'];
    if (!allowedTables.includes(table)) {
        return res.status(403).json({ error: `Tabela "${table}" não é permitida.` });
    }

    try {
        let query;

        switch (action) {
            case 'select': {
                query = supabase.from(table).select('*');
                if (orderBy) {
                    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
                }
                const { data, error } = await query;
                if (error) throw error;
                return res.status(200).json({ data });
            }

            case 'insert': {
                const { data, error } = await supabase.from(table).insert(payload).select();
                if (error) throw error;
                return res.status(201).json({ data });
            }

            case 'update': {
                if (!filter) return res.status(400).json({ error: 'Filtro obrigatório para update.' });
                const { data, error } = await supabase.from(table).update(payload).eq(filter.column, filter.value).select();
                if (error) throw error;
                return res.status(200).json({ data });
            }

            case 'delete': {
                if (!filter) return res.status(400).json({ error: 'Filtro obrigatório para delete.' });

                let deleteQuery = supabase.from(table).delete();

                if (filter.operator === 'like') {
                    deleteQuery = deleteQuery.like(filter.column, filter.value);
                } else {
                    deleteQuery = deleteQuery.eq(filter.column, filter.value);
                }

                const { error } = await deleteQuery;
                if (error) throw error;
                return res.status(200).json({ success: true });
            }

            default:
                return res.status(400).json({ error: `Ação "${action}" desconhecida.` });
        }

    } catch (err) {
        console.error('[ConfeitaAI API Error]', err);
        return res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
    }
};
