const url = "https://ckppwmneicuxtlektrqi.supabase.co/rest/v1/usuarios?select=*";
const key = "sb_publishable_cuEIKbE7HdzXmnrIp2546Q_ru5aInHr";

fetch(url, {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": `Bearer ${key}`
    }
}).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(console.error);
