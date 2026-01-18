const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware: Apenas Treinadores
function isTrainer(req, res, next) {
    if (req.session.user && req.session.user.role === 'trainer') {
        return next();
    }
    res.redirect('/auth/login');
}

router.use(isTrainer);

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        // Estatísticas reais
        const totalClients = await db.query("SELECT COUNT(*) FROM users WHERE trainer_id = $1", [req.session.user.id]);
        const activeClients = await db.query("SELECT COUNT(*) FROM users WHERE trainer_id = $1 AND active = true", [req.session.user.id]);
        
        // Lista recente (Mock ou Real)
        const recentClients = await db.query("SELECT * FROM users WHERE trainer_id = $1 ORDER BY created_at DESC LIMIT 5", [req.session.user.id]);

        res.render('pages/trainer-dashboard', { 
            stats: { 
                totalClients: totalClients.rows[0].count,
                activeClients: activeClients.rows[0].count 
            },
            recentClients: recentClients.rows
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: "Erro ao carregar dashboard" });
    }
});

// Meus Alunos
router.get('/clients', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE trainer_id = $1", [req.session.user.id]);
        res.render('pages/trainer-clients', { clients: result.rows });
    } catch (err) {
        res.redirect('/trainer/dashboard');
    }
});

// Biblioteca de Exercícios
router.get('/library', async (req, res) => {
    try {
        // Pega exercícios globais ou criados pelo treinador
        const result = await db.query("SELECT * FROM exercise_library WHERE created_by IS NULL OR created_by = $1", [req.session.user.id]);
        res.render('pages/trainer-library', { exercises: result.rows });
    } catch (err) {
        console.error(err);
        res.render('pages/trainer-library', { exercises: [] });
    }
});

// Perfil Profissional
router.get('/profile', async (req, res) => {
    try {
        const trainer = await db.query("SELECT * FROM trainers WHERE user_id = $1", [req.session.user.id]);
        res.render('pages/trainer-profile', { trainerData: trainer.rows[0] || {} });
    } catch (err) {
        res.redirect('/trainer/dashboard');
    }
});

// Financeiro
router.get('/financial', async (req, res) => {
    // Mock data para evitar erro se tabela vazia
    res.render('pages/trainer-financial', { 
        revenue: { total: 0, pending: 0 },
        transactions: []
    });
});

module.exports = router;
