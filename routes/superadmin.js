const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireSuperAdminAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

router.use(requireSuperAdminAuth);

router.get('/dashboard', async (req, res) => {
    try {
        const pendingTrainers = await pool.query("SELECT id, name, email, created_at FROM users WHERE role = 'trainer' AND status = 'pending_approval' ORDER BY created_at DESC");
        res.render('pages/superadmin-dashboard', {
            title: 'Painel Super Admin - Momentum Fit',
            trainers: pendingTrainers.rows, currentPage: 'super-dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar o painel.' });
    }
});

router.post('/trainers/approve/:id', async (req, res) => {
    try {
        await pool.query("UPDATE users SET status = 'active' WHERE id = $1 AND role = 'trainer'", [req.params.id]);
        res.redirect('/superadmin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao aprovar treinador.' });
    }
});

router.post('/trainers/reject/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM users WHERE id = $1 AND role = 'trainer'", [req.params.id]);
        res.redirect('/superadmin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao rejeitar treinador.' });
    }
});

router.get('/manage', async (req, res) => {
    try {
        const trainers = await pool.query("SELECT id, name, email, created_at FROM users WHERE role = 'trainer' AND status = 'active' ORDER BY name");
        const clients = await pool.query("SELECT id, name, email, created_at FROM users WHERE role = 'client' ORDER BY name");
        res.render('pages/superadmin-manage', {
            title: 'Gerenciar Usuários - Momentum Fit',
            trainers: trainers.rows,
            clients: clients.rows, currentPage: 'super-manage'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar a página de gerenciamento.' });
    }
});

router.post('/users/delete/:id', async (req, res) => {
    const { id: userIdToDelete } = req.params;
    const { id: currentUserId } = req.session.user;

    if (userIdToDelete === currentUserId) {
        return res.status(400).render('pages/error', { message: 'Você não pode excluir sua própria conta.' });
    }

    try {
        await pool.query("DELETE FROM users WHERE id = $1", [userIdToDelete]);
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao excluir o usuário.' });
    }
});

module.exports = router;
