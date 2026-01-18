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

// Dashboard Principal
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
        res.render('pages/error', { message: 'Erro ao carregar dashboard', error: err });
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
        console.error(err);
        res.redirect('/admin/dashboard');
    }
});

// Rota POST para aprovar (necessária para funcionalidade)
router.post('/approve/:id', async (req, res) => {
    try {
        await db.query('UPDATE trainers SET is_approved = true WHERE id = $1', [req.params.id]);
        req.flash('success', 'Treinador aprovado com sucesso.');
        res.redirect('/admin/approvals');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro ao aprovar.');
        res.redirect('/admin/approvals');
    }
});

// Usuários (No sidebar chama /users, mas renderiza a lista de clientes/users)
router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC");
        res.render('pages/admin-clients', { users: result.rows }); // Reusa admin-clients layout
    } catch (err) {
        console.error(err);
        res.redirect('/admin/dashboard');
    }
});

// Financeiro (A página que deu erro)
router.get('/finance', async (req, res) => {
    // Mock data por enquanto, pode conectar com tabela payments depois
    res.render('pages/admin-finance', { 
        revenue: { total: 15000, month: 3200 },
        transactions: [] 
    });
});

// Planos
router.get('/plans', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM plans ORDER BY price ASC");
        res.render('pages/admin-plans', { plans: result.rows });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/dashboard');
    }
});

module.exports = router;
