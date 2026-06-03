const { createClient } = require('c:/Users/Vitor/Desktop/ConfeitaAI/node_modules/@supabase/supabase-js');

const url = "https://ckppwmneicuxtlektrqi.supabase.co";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";

async function run() {
    const adminSupabase = createClient(url, key);
    
    // Auth as super admin
    let authRes = await adminSupabase.auth.signInWithPassword({
        email: 'naturamixrepresentacoes@gmail.com',
        password: '123456'
    });
    if (authRes.error) {
        authRes = await adminSupabase.auth.signInWithPassword({
            email: 'naturamixrepresentacoes@gmail.com',
            password: '123'
        });
    }
    if (authRes.error) {
        console.error("Auth failed:", authRes.error);
        return;
    }

    console.log("Authenticated as Super Admin.");

    // Retrieve one row from configuracoes and print all its keys
    const { data: configs, error: errC } = await adminSupabase
        .from('configuracoes')
        .select('*')
        .limit(1);

    if (errC) {
        console.error("Error reading configs:", errC);
    } else {
        console.log("Full configuration row example:", configs[0]);
    }

    // Try to manually insert a configuration for Kelry via Admin client to see if it succeeds and works
    const kelryUserId = "ee1075a6-f168-41ad-8796-b258cb515b6f";
    const payload = {
        id: kelryUserId,
        usuario_id: kelryUserId,
        name: "Doces da Kelry",
        slug: "kydeliciabolos",
        phone: "5531999999999", // dummy phone or similar, we can update it if they want
        hours: "Horário a combinar",
        logo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop",
        banner: "",
        desc: "Bem-vinda à nossa loja! Em breve configuraremos nosso cardápio completo.",
        cor_tema: "#ff7eb9",
        loja_aberta: true
    };

    console.log("\nAttempting to insert/upsert configuration for Kelry...");
    const { data: upsertData, error: upsertErr } = await adminSupabase
        .from('configuracoes')
        .upsert([payload])
        .select();

    if (upsertErr) {
        console.error("Upsert failed:", upsertErr);
    } else {
        console.log("Upsert succeeded! Returned data:", upsertData);
    }
}

run();
