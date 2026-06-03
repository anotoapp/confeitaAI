const { createClient } = require('c:/Users/Vitor/Desktop/ConfeitaAI/node_modules/@supabase/supabase-js');

const url = "https://ckppwmneicuxtlektrqi.supabase.co";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";

async function run() {
    const anonSupabase = createClient(url, key);
    const { data, error } = await anonSupabase
        .from('configuracoes')
        .select('*')
        .eq('usuario_id', '86ee47b6-c63a-4a51-8319-bb5579083309')
        .limit(1)
        .maybeSingle();
    
    if (error) {
        console.error("Error fetching doceria config:", error);
    } else {
        console.log("Doceria config record in database:", data);
    }
}

run();
