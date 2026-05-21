const url = "https://ckppwmneicuxtlektrqi.supabase.co/rest/v1/usuarios?email=eq.naturamixrepresentacoes@gmail.com";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";

fetch(url, {
    method: "PATCH",
    headers: {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Prefer": "return=representation"
    },
    body: JSON.stringify({ role: "Super Admin" })
}).then(res => res.text()).then(console.log).catch(console.error);
