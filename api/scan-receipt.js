// api/scan-receipt.js
// Rota Serverless Vercel para ler notas fiscais de compras de estoque via Gemini 1.5 Flash

module.exports = async function handler(req, res) {
    // Permitir CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("Aviso: GEMINI_API_KEY não configurada.");
        return res.status(400).json({ 
            error: 'Chave GEMINI_API_KEY não está configurada no servidor Vercel. Ativando simulação local.' 
        });
    }

    try {
        const { imageBase64, mimeType } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: 'Dados da imagem (imageBase64) ausentes.' });
        }

        // Limpar o prefixo data:image/xxx;base64 se existir
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        const actualMimeType = mimeType || "image/jpeg";

        const prompt = `Você é um leitor óptico (OCR) inteligente de notas fiscais e cupons de compras de supermercado para uma confeitaria. Extraia os ingredientes comprados nesta nota fiscal. Para cada ingrediente extraído, identifique:
1. O nome simplificado do ingrediente (ex: Leite Condensado, Creme de Leite, Farinha de Trigo, Manteiga)
2. A quantidade numérica comprada (ex: 3, 10, 1.5)
3. A unidade de medida mais adequada (un, kg, g, l, ml)
4. O preço unitário pago por item (ou seja, o valor de 1 unidade/kg do ingrediente).

Retorne estritamente um objeto JSON com uma lista sob a chave 'items', no seguinte formato:
{
  "items": [
    {
      "name": "Leite Condensado",
      "qty": 3,
      "unit": "un",
      "price": 7.50
    }
  ]
}

Se houver múltiplos ingredientes na nota, extraia todos na lista. Retorne apenas o JSON puro, sem blocos de código markdown (como \`\`\`json) e sem explicações.`;

        const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
        let response = null;
        let lastError = null;

        for (const model of models) {
            try {
                const payload = {
                    contents: [
                        {
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: actualMimeType,
                                        data: base64Data
                                    }
                                },
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                };

                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    }
                );

                if (response.ok) {
                    break;
                } else {
                    const errText = await response.text();
                    lastError = new Error(`Erro na API do Gemini (${model}): ${response.status} - ${errText}`);
                }
            } catch (e) {
                lastError = e;
            }
        }

        if (!response || !response.ok) {
            throw lastError || new Error("Falha ao se conectar com os modelos do Gemini.");
        }

        const resData = await response.json();
        let jsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // Higienizar possíveis respostas markdown se existirem (mesmo com responseMimeType definido)
        jsonText = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(jsonText);

        return res.status(200).json(parsed);

    } catch (err) {
        console.error("Erro ao processar OCR da nota fiscal:", err);
        return res.status(500).json({ 
            error: 'Erro interno ao processar a nota fiscal com a IA do Gemini.',
            details: err.message
        });
    }
};
