const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Validação do Token de Segurança (passado na URL)
        const token = req.query.token;
        if (token !== 'x97aovcy5nd') {
            console.log('[Kiwify Webhook] Acesso negado: Token inválido ou ausente.');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const payload = req.body;
        console.log('[Kiwify Webhook] Payload recebido:', JSON.stringify(payload));

        // Kiwify payload usa customer.email e order_status: 'paid' (ou approved)
        // Trataremos os possíveis formatos de payload da Kiwify
        const email = payload?.Customer?.email || payload?.customer?.email || payload?.email;
        const status = payload?.order_status || payload?.status;

        if (!email) {
            console.log('[Kiwify Webhook] Ignorado: Sem email no payload.');
            return res.status(200).json({ received: true, ignored: true, reason: 'No email' });
        }

        // Verificamos se o pagamento foi pago ou aprovado
        if (status === 'paid' || status === 'approved') {
            console.log(`[Kiwify Webhook] Pagamento aprovado para o email: ${email}`);

            // Atualiza no Supabase
            const { data, error } = await supabase
                .from('usuarios')
                .update({ 
                    plan: 'PRO', 
                    status: 'Ativo',
                    plan_expires_at: null // Remove a expiração do trial, fica infinito enquanto tiver PRO ativo
                })
                .eq('email', email)
                .select();

            if (error) {
                console.error('[Kiwify Webhook] Erro ao atualizar usuário:', error);
                return res.status(500).json({ error: 'Database update failed' });
            }

            if (data && data.length > 0) {
                console.log(`[Kiwify Webhook] Usuário ${email} promovido para PRO com sucesso!`);
            } else {
                console.log(`[Kiwify Webhook] Usuário ${email} não encontrado. Adicionando à fila de pagamentos pendentes.`);
                // Insert into pagamentos_pendentes
                const { error: insertErr } = await supabase
                    .from('pagamentos_pendentes')
                    .upsert({ email: email }, { onConflict: 'email' });
                
                if (insertErr) {
                    console.error('[Kiwify Webhook] Erro ao adicionar na lista de pendentes:', insertErr);
                }
            }

            return res.status(200).json({ received: true, success: true });
        } else {
            console.log(`[Kiwify Webhook] Ignorado: Status do pedido é ${status}.`);
            // Se foi refund/chargeback, você poderia rebaixar para 'Trial' ou 'Inativo'. 
            // Para simplicidade inicial, só lidamos com aprovações.
            if (status === 'refunded' || status === 'chargedback') {
                await supabase.from('usuarios').update({ plan: 'Trial', status: 'Inativo' }).eq('email', email);
                console.log(`[Kiwify Webhook] Usuário ${email} rebaixado devido a estorno/reembolso.`);
            }
            return res.status(200).json({ received: true, status_ignored: true });
        }

    } catch (err) {
        console.error('[Kiwify Webhook Error]', err);
        return res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
    }
};
