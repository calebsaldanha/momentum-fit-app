const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isTrainer(req, res, next) {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
}

router.get('/dashboard', isTrainer, async (req, res) => {
    try {
        const stats = await db.getTrainerStats(req.session.user.id);
        const recentClients = await db.getRecentClientsByTrainer(req.session.user.id);
        res.render('pages/trainer-dashboard', { 
            title: 'Painel', user: req.session.user, stats, recentClients, currentPage: 'dashboard'
        });
    } catch (err) {
        res.render('pages/error', { title: 'Erro', message: "Erro dashboard" });
    }
});

router.get('/clients', isTrainer, async (req, res) => {
    const clients = await db.getClientsByTrainer(req.session.user.id);
    res.render('pages/trainer-clients', { title: 'Alunos', user: req.session.user, clients, currentPage: 'clients' });
});

router.get('/clients/:id', isTrainer, async (req, res) => {
    try {
        const clientId = req.params.id;
        const clientQuery = `
            SELECT u.name, u.email, u.profile_image, u.created_at as joined_at,
                   c.*, c.id as client_real_id
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `;
        const clientRes = await db.query(clientQuery, [clientId]);
        const clientData = clientRes.rows[0];

        if (!clientData) return res.redirect('/trainer/clients');

        let workouts = [];
        if (clientData.client_real_id) {
            const wRes = await db.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [clientData.client_real_id]);
            workouts = wRes.rows;
        }
        
        res.render('pages/client-details', { 
            title: 'Detalhes do Aluno', 
            user: req.session.user, 
            student: clientData,
            workouts: workouts,
            currentPage: 'clients'
        });

    } catch (err) {
        res.redirect('/trainer/clients');
    }
});

// --- CORREÇÃO: Redirecionamento para o controller correto ---
router.get('/create-workout', isTrainer, (req, res) => {
    const clientId = req.query.client_id;
    if (clientId) {
        return res.redirect(`/workouts/create?client_id=${clientId}`);
    }
    res.redirect('/workouts/create');
});

module.exports = router;
