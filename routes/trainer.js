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
            title: 'Painel do Treinador', user: req.session.user, stats, recentClients 
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { title: 'Erro', message: "Erro ao carregar dashboard" });
    }
});

router.get('/clients', isTrainer, async (req, res) => {
    try {
        const clients = await db.getClientsByTrainer(req.session.user.id);
        res.render('pages/trainer-clients', { 
            title: 'Meus Alunos', user: req.session.user, clients 
        });
    } catch (err) {
        console.error(err);
        res.redirect('/trainer/dashboard');
    }
});

// Detalhes do Cliente (VISÃO COMPLETA DA ANAMNESE)
router.get('/clients/:id', isTrainer, async (req, res) => {
    try {
        const userId = req.params.id; // user_id do cliente
        
        // Busca TODOS os dados do cliente (Anamnese completa)
        const clientQuery = `
            SELECT u.name, u.email, u.profile_image, u.created_at as joined_at,
                   c.*, c.id as client_real_id
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `;
        const clientRes = await db.query(clientQuery, [userId]);
        const clientData = clientRes.rows[0];

        if (!clientData) return res.redirect('/trainer/clients');

        const workoutsRes = await db.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [clientData.client_real_id]);
        
        // Renderiza a view de detalhes com todos os dados
        res.render('pages/trainer-details', { 
            title: 'Detalhes do Aluno', 
            user: req.session.user, 
            client: clientData,
            workouts: workoutsRes.rows 
        });

    } catch (err) {
        console.error(err);
        res.redirect('/trainer/clients');
    }
});

// Outras rotas do treinador (criar treino, etc) mantidas...
router.get('/create-workout', isTrainer, async (req, res) => {
    const clientId = req.query.client_id;
    res.render('pages/create-workout', { title: 'Criar Treino', user: req.session.user, clientId, exercises: [] }); 
});

router.post('/create-workout', isTrainer, async (req, res) => {
    try {
        await db.createWorkout({ ...req.body, trainer_id: req.session.user.id });
        res.redirect('/trainer/clients/' + req.body.client_user_id); // Redireciona para detalhes usando user_id
    } catch (err) {
        res.redirect('/trainer/dashboard');
    }
});

module.exports = router;
