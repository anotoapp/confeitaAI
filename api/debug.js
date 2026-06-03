const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async function handler(req, res) {
    try {
        console.log("Debug endpoint called");
        
        // 1. Fetch one row from usuarios to check columns
        const { data: users, error: usersErr } = await supabase.from('usuarios').select('*').limit(5);
        
        // 2. Fetch from configuracoes
        const { data: configs, error: configErr } = await supabase.from('configuracoes').select('*').limit(5);
        
        res.status(200).json({
            status: "success",
            supabaseUrl: process.env.SUPABASE_URL ? "Defined" : "Undefined",
            hasServiceKey: process.env.SUPABASE_KEY ? "Yes" : "No",
            usersError: usersErr ? { message: usersErr.message, code: usersErr.code } : null,
            usersCount: users ? users.length : 0,
            sampleUsers: users,
            configsError: configErr ? { message: configErr.message, code: configErr.code } : null,
            configsCount: configs ? configs.length : 0,
            sampleConfigs: configs
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};
