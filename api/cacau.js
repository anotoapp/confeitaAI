// api/cacau.js
// Rota Serverless Vercel para a Cacau IA inteligente via Gemini 1.5 Flash

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
            error: 'Chave GEMINI_API_KEY não está configurada no servidor Vercel. Ativando assistente local.' 
        });
    }

    try {
        const { message, contextState } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Mensagem ausente.' });
        }

        // Formatar o estado atual em um texto legível para passar como instrução de sistema
        let contextText = "Nenhum dado de contexto fornecido.";
        if (contextState) {
            const { lowIngredients, income, expense, profit, ordersCount } = contextState;
            contextText = `
DADOS ATUAIS DA CONFEITARIA DO USUÁRIO:
- Ingredientes em estoque crítico/baixo: ${Array.isArray(lowIngredients) && lowIngredients.length > 0 ? lowIngredients.join(", ") : "Nenhum ingrediente em estoque baixo no momento. Tudo ok!"}
- Finanças deste mês:
  * Faturamento (Entradas): R$ ${parseFloat(income || 0).toFixed(2)}
  * Despesas (Saídas): R$ ${parseFloat(expense || 0).toFixed(2)}
  * Lucro Líquido: R$ ${parseFloat(profit || 0).toFixed(2)}
- Quantidade total de encomendas este mês: ${ordersCount || 0}
`;
        }

        const systemPrompt = `Você é a Cacau, a assistente virtual inteligente e conselheira de negócios do aplicativo ConfeitaAI, um sistema SaaS de gestão especializado para confeiteiras.
Seu tom de voz é amigável, acolhedor, doce, entusiasmado, motivador, profissional e prático. Use emojis de confeitaria (🍰, 🧁, 🍫, 🍬, 📈) de forma natural para enriquecer a conversa.

Você responde a dúvidas gerais da confeiteira, analisa os dados financeiros dela e dá dicas de precificação, gestão de estoque e marketing.
Responda de forma concisa (tente não passar de 2 a 3 parágrafos curtos por resposta para caber bem na interface de chat). Sempre responda em português do Brasil.

Aqui está o contexto atual das finanças e estoque da confeiteira que está conversando com você:
${contextText}

Seja proativa! Se ela perguntar sobre finanças ou estoque, use os números acima para responder com exatidão e dê sugestões realistas (ex: se o lucro estiver negativo, sugira revisar as fichas técnicas ou precificação; se houver ingredientes baixos, recomende montar a lista de compras).`;

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
                                    text: message
                                }
                            ]
                        }
                    ],
                    systemInstruction: {
                        parts: [
                            {
                                text: systemPrompt
                            }
                        ]
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
        const replyText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar a resposta.";

        return res.status(200).json({ reply: replyText.trim() });

    } catch (err) {
        console.error("Erro no chat da Cacau:", err);
        return res.status(500).json({ 
            error: 'Erro interno ao processar conversa com o Gemini.',
            details: err.message
        });
    }
};
