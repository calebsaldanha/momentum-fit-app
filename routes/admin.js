const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware: Verifica se é Admin
function isAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
}

router.use(isAdmin);

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const stats = {
            totalUsers: (await db.query('SELECT COUNT(*) FROM users')).rows[0].count,
            totalTrainers: (await db.query("SELECT COUNT(*) FROM users WHERE role = 'trainer'")).rows[0].count,
            pendingApprovals: (await db.query("SELECT COUNT(*) FROM trainers WHERE is_approved = false")).rows[0].count
        };
        res.render('pages/admin-dashboard', { stats });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro no Dashboard', error: err });
    }
});

// Lista de Usuários
router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, created_at, active FROM users ORDER BY created_at DESC");
        res.render('pages/admin-clients', { users: result.rows });
    } catch (err) {
        res.redirect('/admin/dashboard');
    }
});

// Detalhes do Usuário (NOVA ROTA)
router.get('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const userRes = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
        
        if (userRes.rows.length === 0) {
            req.flash('error', 'Usuário não encontrado.');
            return res.redirect('/admin/users');
        }

        const user = userRes.rows[0];
        let details = {};

        // Busca detalhes extras dependendo da role
        if (user.role === 'trainer') {
            const trainerRes = await db.query("SELECT * FROM trainers WHERE user_id = $1", [userId]);
            details = trainerRes.rows[0] || {};
        } else if (user.role === 'client') {
            const clientRes = await db.query("SELECT * FROM clients WHERE user_id = $1", [userId]);
            details = clientRes.rows[0] || {};
        }

        res.render('pages/admin-user-details', { targetUser: user, details });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro ao carregar usuário.');
        res.redirect('/admin/users');
    }
});

// Ação de Bloquear/Desbloquear
router.post('/users/:id/toggle-status', async (req, res) => {
    try {
        await db.query("UPDATE users SET active = NOT active WHERE id = $1", [req.params.id]);
        req.flash('success', 'Status do usuário atualizado.');
        res.redirect(`/admin/users/${req.params.id}`);
    } catch (err) {
        req.flash('error', 'Erro ao atualizar status.');
        res.redirect('/admin/users');
    }
});

// Aprovações
router.get('/approvals', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.id, u.name, u.email, t.specialties, t.created_at 
            FROM trainers t
            JOIN users u ON t.user_id = u.id
            WHERE t.is_approved = false
        `);
        res.render('pages/admin-approvals', { pendingTrainers: result.rows });
    } catch (err) {
        res.redirect('/admin/dashboard');
    }
});

// Aprovar Treinador
router.post('/approve/:id', async (req, res) => {
    try {
        await db.query('UPDATE trainers SET is_approved = true WHERE id = $1', [req.params.id]);
        req.flash('success', 'Aprovado com sucesso.');
        res.redirect('/admin/approvals');
    } catch (err) {
        req.flash('error', 'Erro ao aprovar.');
        res.redirect('/admin/approvals');
    }
});

// Outras rotas (Financeiro, Planos...)
router.get('/finance', (req, res) => res.render('pages/admin-finance', { revenue: { total: 0 } }));
router.get('/plans', async (req, res) => {
    const plans = await db.query("SELECT * FROM plans");
    res.render('pages/admin-plans', { plans: plans.rows });
});

module.exports = router;
