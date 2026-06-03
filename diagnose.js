const { createClient } = require('c:/Users/Vitor/Desktop/ConfeitaAI/node_modules/@supabase/supabase-js');

const url = "https://ckppwmneicuxtlektrqi.supabase.co";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";

async function run() {
    // 1. Query configurations anonymously (RLS allows SELECT * TO anon USING true)
    console.log("=== LISTING ALL CONFIGURATIONS ANONYMOUSLY ===");
    const anonSupabase = createClient(url, key);
    const { data: configs, error: errC } = await anonSupabase
        .from('configuracoes')
        .select('usuario_id, name, slug, phone, hours');
        
    if (errC) {
        console.error("Error fetching configs:", errC);
    } else {
        console.log(`Found ${configs.length} store configurations:`);
        console.log(JSON.stringify(configs, null, 2));
    }

    // 2. Authenticate as Super Admin
    console.log("\n=== AUTHENTICATING AS SUPER ADMIN ===");
    const adminSupabase = createClient(url, key);
    let authRes = null;
    try {
        authRes = await adminSupabase.auth.signInWithPassword({
            email: 'naturamixrepresentacoes@gmail.com',
            password: '123456'
        });
    } catch (e) {}
    
    if (!authRes || authRes.error) {
        authRes = await adminSupabase.auth.signInWithPassword({
            email: 'naturamixrepresentacoes@gmail.com',
            password: '123'
        });
    }
    
    if (authRes.error) {
        console.error("Authentication failed:", authRes.error);
        return;
    }
    
    console.log("Authenticated successfully!");
    
    // 3. Get all users
    console.log("\n=== LISTING REGISTERED USERS ===");
    const { data: users, error: errU } = await adminSupabase
        .from('usuarios')
        .select('id, name, email, username, role, plan, plan_expires_at, last_login, created_at')
        .order('created_at', { ascending: false });
        
    if (errU) {
        console.error("Error fetching users:", errU);
        return;
    }
    
    console.log(`Found ${users.length} users:`);
    console.log(JSON.stringify(users, null, 2));
}

run();
