const { createClient } = require('c:/Users/Vitor/Desktop/ConfeitaAI/node_modules/@supabase/supabase-js');

const url = "https://ckppwmneicuxtlektrqi.supabase.co";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";

async function testResolveSlug(storefrontSlug) {
    const supabaseClient = createClient(url, key);
    console.log("Resolving slug:", storefrontSlug);
    
    // 1. Direct query
    let { data: configData, error: configErr } = await supabaseClient
        .from('configuracoes')
        .select('*')
        .eq('slug', storefrontSlug)
        .limit(1)
        .maybeSingle();

    if (configErr) {
        console.error("Direct query error:", configErr);
        return;
    }

    if (configData) {
        console.log("Found directly:", configData.name, "with slug:", configData.slug);
        return;
    }

    // 2. Fallback query
    console.log("Not found directly. Trying approximate search...");
    const cleanSlug = storefrontSlug.replace(/[^a-z0-9]/g, "");
    
    const { data: allConfigs, error: allErr } = await supabaseClient
        .from('configuracoes')
        .select('*');
        
    if (allErr) {
        console.error("All configs query error:", allErr);
        return;
    }

    if (allConfigs) {
        configData = allConfigs.find(c => {
            const dbClean = (c.slug || "").replace(/[^a-z0-9]/g, "");
            return dbClean === cleanSlug;
        }) || null;
    }

    if (configData) {
        console.log("Found via intelligent fallback:", configData.name, "with slug:", configData.slug);
    } else {
        console.log("Not found even with fallback.");
    }
}

async function run() {
    await testResolveSlug("doceria.albuquerque");
    await testResolveSlug("doceriaalbuquerque_");
    await testResolveSlug("kydeliciabolos");
}

run();
