const { createClient } = require('c:/Users/Vitor/Desktop/ConfeitaAI/node_modules/@supabase/supabase-js');
const fs = require('fs');

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
        fs.writeFileSync('scratch/output.txt', "Auth failed: " + JSON.stringify(authRes.error));
        return;
    }

    const { data: configs, error: errC } = await adminSupabase
        .from('configuracoes')
        .select('*');

    if (errC) {
        fs.writeFileSync('scratch/output.txt', "Error reading configs: " + JSON.stringify(errC));
    } else {
        const result = {
            keys: Object.keys(configs[0]),
            vitorConfig: configs.find(c => c.slug === 'vitor')
        };
        fs.writeFileSync('scratch/output.txt', JSON.stringify(result, null, 2));
        console.log("Written output to scratch/output.txt successfully!");
    }
}

run();
