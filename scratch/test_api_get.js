const http = require('https');

const options = {
    hostname: 'confeita-ai.vercel.app',
    port: 443,
    path: '/api/config',
    method: 'GET'
};

console.log("Sending GET request to https://confeita-ai.vercel.app/api/config ...");

const req = http.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Response Body: ${responseBody}`);
    });
});

req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
});

req.end();
