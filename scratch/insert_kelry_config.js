const http = require('https');

const kelryUserId = "ee1075a6-f168-41ad-8796-b258cb515b6f";
const payload = {
    id: kelryUserId,
    usuario_id: kelryUserId,
    name: "Doces da Kelry",
    slug: "kydeliciabolos",
    phone: "",
    hours: "Horário a combinar",
    logo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop",
    banner: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=400&fit=crop",
    desc: "Bem-vinda à nossa loja! Em breve configuraremos nosso cardápio completo.",
    cor_tema: "#ff7eb9",
    loja_aberta: true
};

const reqData = JSON.stringify({
    action: 'insert',
    table: 'configuracoes',
    payload: [payload]
});

const options = {
    hostname: 'confeita-ai.vercel.app',
    port: 443,
    path: '/api/db',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(reqData)
    }
};

console.log("Sending insert request to https://confeita-ai.vercel.app/api/db ...");

const req = http.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log("Headers:", JSON.stringify(res.headers, null, 2));
        console.log(`Response Body: ${responseBody}`);
    });
});

req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
});

req.write(reqData);
req.end();
