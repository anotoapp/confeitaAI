const { createClient } = require('c:/Users/Vitor/Desktop/ConfeitaAI/node_modules/@supabase/supabase-js');

const url = "https://ckppwmneicuxtlektrqi.supabase.co";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";

async function run() {
    console.log("=== DIAGNOSING USER KELRY ===");
    
    // Authenticate as Super Admin
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
    
    console.log("Super Admin Authenticated!");

    // Find the user with email 'kelrydemiranda3986@gmail.com'
    const { data: users, error: errU } = await adminSupabase
        .from('usuarios')
        .select('*');
        
    if (errU) {
        console.error("Error fetching users:", errU);
        return;
    }

    const kelryUser = users.find(u => u.email && u.email.toLowerCase() === 'kelrydemiranda3986@gmail.com');
    if (!kelryUser) {
        console.log("User kelrydemiranda3986@gmail.com NOT found in 'usuarios' table.");
        // Let's print users close to that or list last 10 users
        console.log("Last 10 registered users:");
        console.log(users.slice(0, 10).map(u => ({ id: u.id, name: u.name, email: u.email, username: u.username })));
        return;
    }

    console.log("Found User:", JSON.stringify(kelryUser, null, 2));

    // Get configurations for this user_id
    const { data: configs, error: errC } = await adminSupabase
        .from('configuracoes')
        .select('*')
        .eq('usuario_id', kelryUser.id);

    if (errC) {
        console.error("Error fetching configs:", errC);
    } else {
        console.log(`Found ${configs.length} configs for this user:`, JSON.stringify(configs, null, 2));
    }
    
    // Also search configs table for slug 'kydeliciabolos'
    const { data: slugConfigs, error: errS } = await adminSupabase
        .from('configuracoes')
        .select('*');
        
    if (!errS && slugConfigs) {
        const foundBySlug = slugConfigs.find(c => (c.slug || "").toLowerCase() === 'kydeliciabolos');
        console.log("\nSearching config for slug 'kydeliciabolos':", foundBySlug ? JSON.stringify(foundBySlug, null, 2) : "NOT FOUND");
        
        console.log("\nAll configs in DB:");
        console.log(slugConfigs.map(c => ({ usuario_id: c.usuario_id, name: c.name, slug: c.slug, phone: c.phone })));
    }
}

run();
