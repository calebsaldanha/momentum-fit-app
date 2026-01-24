const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

// Middleware Global para rotas de Admin
router.use(ensureAuthenticated);
router.use(ensureRole('admin'));

// --- DASHBOARD CENTRAL ---
router.get('/dashboard', async (req, res) => {
    try {
        console.log("��� Carregando Dashboard Completo...");
        
        // Consultas em paralelo para performance
        // 1. Estatísticas Gerais
        // 2. Usuários Recentes (LIMIT 5)
        const [usersQ, trainersQ, clientsQ, recentUsersQ] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query("SELECT COUNT(*) FROM users WHERE role = 'trainer'"),
            pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'"),
            pool.query("SELECT id, name, email, role, created_at, status FROM users ORDER BY created_at DESC LIMIT 5")
        ]);

        const stats = {
            totalUsers: parseInt(usersQ.rows[0].count),
            totalTrainers: parseInt(trainersQ.rows[0].count),
            totalClients: parseInt(clientsQ.rows[0].count),
            activePlans: 0, 
            revenue: 0 
        };

        // Formatação básica de data para exibição (opcional, evita erro se EJS não formatar)
        const recentUsers = recentUsersQ.rows.map(u => ({
            ...u,
            formattedDate: new Date(u.created_at).toLocaleDateString('pt-BR')
        }));

        res.render('pages/admin-dashboard', { 
            user: req.user,
            stats: stats,
            recentUsers: recentUsers, // ✅ O que estava faltando
            
            // ���️ Prevenção de Erros Futuros:
            // Passamos arrays vazios para variáveis que a view PODE vir a pedir
            activities: [],
            notifications: [],
            path: req.path
        });

    } catch (err) {
        console.error("��� Erro Crítico no Dashboard Admin:", err);
        // Renderiza página de erro mas mantém o layout funcional se possível
        res.render('pages/error', { message: 'Falha ao carregar dados do painel administrativo.' });
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
        console.error("Erro em /users:", err);
        res.redirect('/admin/dashboard');
    }
});

// --- APROVAÇÕES ---
router.get('/approvals', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users WHERE role = 'trainer' ORDER BY created_at DESC");
        res.render('pages/admin-approvals', { 
            user: req.user, 
            trainers: result.rows,
            path: req.path
        });
    } catch (err) {
        console.error("Erro em /approvals:", err);
        res.redirect('/admin/dashboard');
    }
});

// --- PLANOS ---
router.get('/plans', async (req, res) => {
    try {
        let plans = [];
        try {
            const result = await pool.query('SELECT * FROM plans');
            plans = result.rows;
        } catch (e) { 
            console.warn("Tabela plans não encontrada, enviando vazio.");
        }
        res.render('pages/admin-plans', { 
            user: req.user, 
            plans: plans,
            path: req.path
        });
    } catch (err) {
        console.error("Erro em /plans:", err);
        res.redirect('/admin/dashboard');
    }
});

module.exports = router;
