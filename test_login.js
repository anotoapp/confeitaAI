const url = "https://ckppwmneicuxtlektrqi.supabase.co/rest/v1/usuarios?email=eq.naturamixrepresentacoes%40gmail.com&password=eq.123456&select=*&limit=1";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";

fetch(url, {
    headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
    }
}).then(res => res.json()).then(data => console.log("Login result:", data)).catch(console.error);
