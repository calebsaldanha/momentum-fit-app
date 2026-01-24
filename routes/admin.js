const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

// Middleware Global para rotas de Admin (Segurança Dupla)
router.use(ensureAuthenticated);
router.use(ensureRole('admin'));

// --- DASHBOARD (A Rota Quebrada) ---
router.get('/dashboard', async (req, res) => {
    try {
        console.log("��� Carregando estatísticas do Dashboard...");
        
        // Executa queries em paralelo para performance
        const [usersQ, trainersQ, clientsQ] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query("SELECT COUNT(*) FROM users WHERE role = 'trainer'"),
            pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'")
        ]);

        // Objeto stats esperado pela View
        const stats = {
            totalUsers: parseInt(usersQ.rows[0].count),
            totalTrainers: parseInt(trainersQ.rows[0].count),
            totalClients: parseInt(clientsQ.rows[0].count),
            // Adicione mais métricas aqui conforme a view pedir
            activePlans: 0, 
            revenue: 0 
        };

        res.render('pages/admin-dashboard', { 
            user: req.user,
            stats: stats,
            path: req.path // Redundância segura
        });

    } catch (err) {
        console.error("��� Erro no Dashboard Admin:", err);
        res.render('pages/error', { message: 'Erro ao carregar dados do painel.' });
    }
});

// --- GERENCIAMENTO DE USUÁRIOS ---
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 50');
        res.render('pages/admin-users', { 
            user: req.user, 
            users: result.rows,
            path: req.path
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/dashboard');
    }
});

// --- APROVAÇÕES PENDENTES (TRAINERS) ---
router.get('/approvals', async (req, res) => {
    try {
        // Assume que existe um status 'pending' ou similar
        const result = await pool.query("SELECT * FROM users WHERE role = 'trainer' ORDER BY created_at DESC");
        res.render('pages/admin-approvals', { 
            user: req.user, 
            trainers: result.rows, // Nome da variável pode variar no EJS, ajustável
            path: req.path
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/dashboard');
    }
});

// --- PLANOS ---
router.get('/plans', async (req, res) => {
    try {
        // Verifica se a tabela plans existe, senão manda array vazio para não quebrar
        let plans = [];
        try {
            const result = await pool.query('SELECT * FROM plans');
            plans = result.rows;
        } catch (e) {
            console.warn("⚠️ Tabela 'plans' não encontrada ou vazia.");
        }

        res.render('pages/admin-plans', { 
            user: req.user, 
            plans: plans,
            path: req.path
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/dashboard');
    }
});

module.exports = router;
