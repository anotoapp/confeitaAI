const { createClient } = require('c:/Users/Vitor/Desktop/ConfeitaAI/node_modules/@supabase/supabase-js');

const url = "https://ckppwmneicuxtlektrqi.supabase.co";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";

async function run() {
    const anonSupabase = createClient(url, key);
    const { data, error } = await anonSupabase
        .from('produtos')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error("Error fetching products:", error);
    } else {
        console.log("Product record columns:", Object.keys(data[0] || {}));
        console.log("Full product sample:", data[0]);
    }
}

run();
