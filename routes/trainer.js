const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware de Autenticação para Trainer
function isTrainer(req, res, next) {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
}

router.use(isTrainer);

// 1. Dashboard: Visão Geral
router.get('/dashboard', async (req, res) => {
    try {
        // Busca estatísticas básicas
        const clients = await db.getClientsByTrainer(req.session.user.id);
        const activeClients = clients.length;
        
        // Simulação de checkins recentes (idealmente viria do DB)
        const recentCheckins = await db.query(`
            SELECT c.*, u.name as client_name 
            FROM checkins c
            JOIN users u ON c.user_id = u.id
            WHERE u.trainer_id = $1
            ORDER BY c.created_at DESC LIMIT 5
        `, [req.session.user.id]);

        res.render('pages/trainer-dashboard', { 
            title: 'Painel do Treinador', 
            user: req.session.user, 
            stats: { activeClients, totalCheckins: 0 }, // Pode expandir depois
            recentCheckins: recentCheckins.rows,
            currentPage: '/trainer/dashboard',
            csrfToken: req.csrfToken()
        });
    } catch (e) {
        console.error(e);
        res.render('pages/error', { message: 'Erro ao carregar painel.' });
    }
});

// 2. Lista de Alunos
router.get('/clients', async (req, res) => {
    try {
        const clients = await db.getClientsByTrainer(req.session.user.id);
        res.render('pages/trainer-clients', { 
            title: 'Meus Alunos', 
            user: req.session.user, 
            clients: clients,
            currentPage: '/trainer/clients',
            csrfToken: req.csrfToken()
        });
    } catch (e) {
        console.error(e);
        res.redirect('/trainer/dashboard');
    }
});

// 3. Perfil do Treinador
router.get('/profile', async (req, res) => {
    try {
        // Busca dados estendidos do treinador se houver tabela 'trainers'
        // Por enquanto usa dados do user session
        res.render('pages/trainer-profile', { 
            title: 'Meu Perfil', 
            user: req.session.user, 
            currentPage: '/trainer/profile',
            csrfToken: req.csrfToken()
        });
    } catch (e) {
        res.redirect('/trainer/dashboard');
    }
});

router.post('/profile/update', async (req, res) => {
    // Lógica de update simplificada
    const { name, email } = req.body;
    try {
        await db.updateUser(req.session.user.id, { name, email });
        // Atualiza a sessão
        req.session.user.name = name;
        req.session.user.email = email;
        res.redirect('/trainer/profile');
    } catch (e) {
        console.error(e);
        res.redirect('/trainer/profile');
    }
});


router.get('/financial', async (req, res) => {
    // Simula dados financeiros
    const transactions = await db.query("SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC", [req.session.user.id]);
    res.render('pages/trainer-financial', { 
        title: 'Financeiro', user: req.session.user, 
        balance: 1250.00, transactions: transactions.rows,
        currentPage: '/trainer/financial', csrfToken: req.csrfToken()
    });
});

module.exports = router;
