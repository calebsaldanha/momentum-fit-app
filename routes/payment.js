const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const pool = require('../database/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Rota: Tela de Confirmação (Antes de ir para Stripe)
router.get('/checkout/:planSlug', ensureAuthenticated, async (req, res) => {
    try {
        const { planSlug } = req.params;
        const planResult = await pool.query('SELECT * FROM plans WHERE slug = $1', [planSlug]);
        
        if (planResult.rows.length === 0) {
            req.flash('error', 'Plano não encontrado.');
            return res.redirect('/client/plans');
        }

        const plan = planResult.rows[0];
        
        // ⚡ LÓGICA DE ATIVAÇÃO IMEDIATA PARA PLANOS GRÁTIS
        // Se o preço for 0, não precisamos mandar para a Stripe (reduz fricção)
        if (parseFloat(plan.price) <= 0) {
             console.log(`Ativando plano grátis ${plan.name} para usuário ${req.user.id}`);
             
             // Atualiza o usuário diretamente
             await pool.query(`
                UPDATE users 
                SET current_plan_id = $1, 
                    plan_expires_at = NULL -- NULL significa "para sempre" ou "até mudar"
                WHERE id = $2
             `, [plan.id, req.user.id]);

             // Cria notificação
             await pool.query(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES ($1, 'system', 'Plano Ativado', 'Bem-vindo ao plano Start!')
             `, [req.user.id]);

             req.flash('success', 'Plano Start ativado com sucesso! Comece seus treinos.');
             return res.redirect('/client/dashboard');
        }

        // Se for pago, mostra a tela de confirmação para ir ao Stripe
        res.render('pages/client-checkout', {
            user: req.user,
            plan: plan,
            path: '/client/checkout'
        });

    } catch (err) {
        console.error("Erro no checkout:", err);
        req.flash('error', 'Erro ao processar solicitação.');
        res.redirect('/client/plans');
    }
});

// Rota: Criar Sessão Stripe e Redirecionar (POST)
router.post('/create-checkout-session', ensureAuthenticated, async (req, res) => {
    const { planId } = req.body;

    try {
        const planResult = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
        const plan = planResult.rows[0];

        if (!plan.stripe_price_id) {
            throw new Error('Configuração incompleta: ID da Stripe não encontrado para este plano.');
        }

        console.log(`Iniciando checkout Stripe para: ${plan.name} (ID: ${plan.stripe_price_id})`);

        // Cria a sessão de checkout na Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'boleto'], // PIX é automático se BRL for suportado na conta
            line_items: [
                {
                    price: plan.stripe_price_id,
                    quantity: 1,
                },
            ],
            mode: 'subscription', // Assinatura recorrente
            success_url: `${req.protocol}://${req.get('host')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.protocol}://${req.get('host')}/payment/cancel`,
            customer_email: req.user.email,
            metadata: {
                user_id: req.user.id,
                plan_id: plan.id,
                plan_name: plan.name
            },
            // Opcional: Permitir códigos de promoção
            allow_promotion_codes: true
        });

        res.redirect(session.url);

    } catch (err) {
        console.error('Erro Stripe:', err);
        req.flash('error', 'Erro ao conectar com pagamento: ' + err.message);
        res.redirect('/client/plans');
    }
});

// Rota: Retorno de Sucesso da Stripe
router.get('/success', ensureAuthenticated, async (req, res) => {
    const { session_id } = req.query;

    try {
        // Validação de Segurança: Perguntar à Stripe se pagou mesmo
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status === 'paid' || session.status === 'complete') {
            const planId = session.metadata.plan_id;
            const userId = session.metadata.user_id;

            // 1. Registrar Transação Financeira
            await pool.query(`
                INSERT INTO payments (user_id, plan_id, amount, method, status, stripe_checkout_session_id)
                VALUES ($1, $2, $3, 'stripe_checkout', 'paid', $4)
                ON CONFLICT (stripe_checkout_session_id) DO NOTHING
            `, [userId, planId, session.amount_total / 100, session_id]);

            // 2. Ativar Plano no Usuário (30 dias de acesso)
            await pool.query(`
                UPDATE users 
                SET current_plan_id = $1, 
                    plan_expires_at = NOW() + INTERVAL '30 days' 
                WHERE id = $2
            `, [planId, userId]);

            // 3. Notificar
            await pool.query(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES ($1, 'payment', 'Pagamento Confirmado', 'Seu plano Pro foi ativado. Bons treinos!')
            `, [userId]);

            req.flash('success', 'Assinatura confirmada! Bem-vindo ao próximo nível.');
        } else {
            // Caso de PIX pendente ou Boleto
            req.flash('info', 'Pagamento em processamento. Assim que o banco confirmar, seu plano será liberado.');
        }
    } catch (e) {
        console.error("Erro ao validar sucesso Stripe:", e);
        req.flash('error', 'Erro ao confirmar pagamento. Entre em contato com o suporte.');
    }

    res.redirect('/client/dashboard');
});

router.get('/cancel', ensureAuthenticated, (req, res) => {
    req.flash('info', 'Processo de pagamento cancelado.');
    res.redirect('/client/plans');
});

module.exports = router;
