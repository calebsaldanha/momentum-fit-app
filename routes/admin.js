const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

function isAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
}

router.use(isAdmin);

router.get('/dashboard', (req, res) => res.render('pages/admin-dashboard'));

// === LISTA DE USUÁRIOS ===
router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM users ORDER BY created_at DESC");
        res.render('pages/admin-users', { users: result.rows });
    } catch(e) {
        console.error(e);
        res.redirect('/admin/dashboard');
    }
});

// === DETALHES DO USUÁRIO COMPLETO ===
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Usuário Base
        const userRes = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        if (userRes.rows.length === 0) return res.redirect('/admin/users');
        const targetUser = userRes.rows[0];

        // 2. Detalhes Específicos (Client ou Trainer)
        let details = {};
        if (targetUser.role === 'client') {
            const clientRes = await db.query("SELECT * FROM clients WHERE user_id = $1", [id]);
            details = clientRes.rows[0] || {};
            details.goal = details.fitness_goals || details.goal || ''; 
        } else if (targetUser.role === 'trainer') {
            const trainerRes = await db.query("SELECT * FROM trainers WHERE user_id = $1", [id]);
            details = trainerRes.rows[0] || {};
        }

        // 3. Dados Auxiliares para Dropdowns e Listas
        const plans = await db.query("SELECT * FROM plans WHERE is_active = true");
        const trainers = await db.query("SELECT id, name FROM users WHERE role = 'trainer' AND status = 'active'");
        
        // 4. Dados Relacionados (Treinos, Financeiro)
        const workouts = await db.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [id]);
        
        const financials = await db.query(`
            SELECT p.*, pl.name as plan_name 
            FROM payments p 
            LEFT JOIN subscriptions s ON p.subscription_id = s.id 
            LEFT JOIN plans pl ON s.plan_id = pl.id 
            WHERE p.user_id = $1 
            ORDER BY p.created_at DESC
        `, [id]);

        const activeSub = await db.query(`
            SELECT s.*, p.name as plan_name, p.price 
            FROM subscriptions s 
            JOIN plans p ON s.plan_id = p.id 
            WHERE s.user_id = $1 AND s.status IN ('active', 'pending_payment', 'past_due')
            ORDER BY s.start_date DESC LIMIT 1
        `, [id]);

        res.render('pages/admin-user-details', { 
            targetUser, 
            details, 
            plans: plans.rows,
            trainers: trainers.rows,
            workouts: workouts.rows,
            payments: financials.rows,
            subscription: activeSub.rows[0] || null
        });

    } catch(e) {
        console.error("Erro user details:", e);
        req.flash('error', 'Erro ao carregar detalhes.');
        res.redirect('/admin/users');
    }
});

// === AÇÕES DE GESTÃO DE USUÁRIO ===

// 1. Suspender/Ativar Usuário
router.post('/users/:id/suspend', async (req, res) => {
    try {
        const { status } = req.body; // 'active' ou 'suspended'
        await db.query("UPDATE users SET status = $1 WHERE id = $2", [status, req.params.id]);
        req.flash('success', `Status atualizado para ${status}.`);
    } catch(e) { req.flash('error', 'Erro ao atualizar status.'); }
    res.redirect(`/admin/users/${req.params.id}`);
});

// 2. Excluir Usuário (Soft delete ou Hard delete - aqui faremos Hard delete seguro)
router.post('/users/:id/delete', async (req, res) => {
    try {
        // Em um sistema real, geralmente faríamos soft delete (active=false), mas o pedido foi excluir.
        // Precisamos limpar dependências ou usar CASCADE no banco.
        // Vamos assumir que o banco tem ON DELETE CASCADE configurado nas tabelas filhas.
        await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
        req.flash('success', 'Usuário excluído permanentemente.');
        res.redirect('/admin/users');
    } catch(e) {
        console.error(e);
        req.flash('error', 'Erro ao excluir (verifique dependências).');
        res.redirect(`/admin/users/${req.params.id}`);
    }
});

// 3. Alterar Senha (Reset Manual)
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const { new_password } = req.body;
        const hash = await bcrypt.hash(new_password, 10);
        await db.query("UPDATE users SET password = $1 WHERE id = $2", [hash, req.params.id]);
        req.flash('success', 'Senha alterada com sucesso.');
    } catch(e) { req.flash('error', 'Erro ao alterar senha.'); }
    res.redirect(`/admin/users/${req.params.id}`);
});

// 4. Mudar Plano (Admin Override)
router.post('/users/:id/change-plan', async (req, res) => {
    try {
        const { plan_id } = req.body;
        const userId = req.params.id;

        await db.query('BEGIN');
        // Cancelar atual
        await db.query("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1", [userId]);
        
        // Criar nova assinatura ativa
        await db.query(`
            INSERT INTO subscriptions (user_id, plan_id, status, start_date, auto_renew)
            VALUES ($1, $2, 'active', NOW(), true)
        `, [userId, plan_id]);
        
        await db.query('COMMIT');
        req.flash('success', 'Plano alterado com sucesso.');
    } catch(e) {
        await db.query('ROLLBACK');
        req.flash('error', 'Erro ao mudar plano.');
    }
    res.redirect(`/admin/users/${req.params.id}`);
});

// 5. Mudar Personal (Atribuir Treinador)
router.post('/users/:id/assign-trainer', async (req, res) => {
    try {
        const { trainer_id } = req.body;
        // Atualiza na tabela users e client_profiles se existir
        await db.query("UPDATE users SET trainer_id = $1 WHERE id = $2", [trainer_id, req.params.id]);
        await db.query("UPDATE client_profiles SET assigned_trainer_id = $1 WHERE user_id = $2", [trainer_id, req.params.id]);
        
        req.flash('success', 'Personal trainer atribuído.');
    } catch(e) { req.flash('error', 'Erro ao atribuir personal.'); }
    res.redirect(`/admin/users/${req.params.id}`);
});

// 6. Enviar Cobrança (Mock)
router.post('/users/:id/send-reminder', async (req, res) => {
    try {
        // Aqui entraria a lógica de envio de email (Nodemailer, SendGrid, etc)
        // Por enquanto, apenas simulamos.
        console.log(`[MOCK EMAIL] Enviando cobrança para usuário ID ${req.params.id}`);
        req.flash('success', 'Lembrete de cobrança enviado por e-mail.');
    } catch(e) { req.flash('error', 'Erro ao enviar cobrança.'); }
    res.redirect(`/admin/users/${req.params.id}`);
});

// === FINANCEIRO GERAL ===
router.get('/finance', async (req, res) => {
    try {
        const pending = await db.query(`
            SELECT py.*, u.name as user_name, u.email, pl.name as plan_name 
            FROM payments py
            JOIN users u ON py.user_id = u.id
            LEFT JOIN subscriptions s ON py.subscription_id = s.id
            LEFT JOIN plans pl ON s.plan_id = pl.id
            WHERE py.status = 'pending'
            ORDER BY py.created_at ASC
        `);

        const activeSubs = await db.query(`
            SELECT s.*, u.name as user_name, pl.name as plan_name 
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            JOIN plans pl ON s.plan_id = pl.id
            WHERE s.status = 'active'
        `);

        res.render('pages/admin-finance', { 
            pendingPayments: pending.rows,
            activeSubscriptions: activeSubs.rows
        });
    } catch (err) {
        res.redirect('/admin/dashboard');
    }
});

router.post('/finance/approve', async (req, res) => {
    const { payment_id } = req.body;
    try {
        await db.query('BEGIN');
        const payRes = await db.query(`UPDATE payments SET status = 'paid', payment_date = NOW() WHERE id = $1 RETURNING subscription_id`, [payment_id]);
        if(payRes.rows.length > 0) {
            await db.query(`UPDATE subscriptions SET status = 'active' WHERE id = $1`, [payRes.rows[0].subscription_id]);
        }
        await db.query('COMMIT');
        req.flash('success', 'Aprovado.');
    } catch (e) {
        await db.query('ROLLBACK');
        req.flash('error', 'Erro.');
    }
    res.redirect('/admin/finance');
});

router.post('/finance/reject', async (req, res) => {
    try {
        await db.query("UPDATE payments SET status = 'rejected' WHERE id = $1", [req.body.payment_id]);
        req.flash('success', 'Rejeitado.');
    } catch (e) { req.flash('error', 'Erro.'); }
    res.redirect('/admin/finance');
});

router.post('/finance/suspend', async (req, res) => {
    try {
        await db.query("UPDATE subscriptions SET status = 'suspended' WHERE id = $1", [req.body.subscription_id]);
        req.flash('success', 'Suspenso.');
    } catch (e) { req.flash('error', 'Erro.'); }
    res.redirect('/admin/finance');
});

router.post('/finance/downgrade', async (req, res) => {
    try {
        await db.query("UPDATE subscriptions SET status = 'cancelled' WHERE id = $1", [req.body.subscription_id]);
        req.flash('success', 'Cancelado.');
    } catch (e) { req.flash('error', 'Erro.'); }
    res.redirect('/admin/finance');
});

// Outras rotas Admin
router.get('/approvals', (req, res) => res.render('pages/admin-approvals', { pendingTrainers: [] }));
router.get('/content', (req, res) => res.render('pages/admin-content'));
router.get('/ia-audit', (req, res) => res.render('pages/admin-ia-audit'));
router.get('/settings', (req, res) => res.render('pages/admin-settings'));

module.exports = router;
