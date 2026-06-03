const { createClient } = require('c:/Users/Vitor/Desktop/ConfeitaAI/node_modules/@supabase/supabase-js');

const url = "https://ckppwmneicuxtlektrqi.supabase.co";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";

async function run() {
    const anonSupabase = createClient(url, key);
    const { data: users, error } = await anonSupabase
        .from('usuarios')
        .select('id, username')
        .eq('username', 'doceria.albuquerque');
    
    if (error) {
        console.error("Error querying usuarios anonymously:", error);
    } else {
        console.log("Users found anonymously:", users);
    }
}

run();
