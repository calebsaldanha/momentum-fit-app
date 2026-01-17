const express = require('express');
const router = express.Router();
const db = require('../database/db');

function requireTrainer(req, res, next) {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'admin')) return next();
    res.redirect('/auth/login');
}
router.use(requireTrainer);

router.get('/dashboard', async (req, res) => {
    try {
        const clients = await db.query("SELECT COUNT(*) FROM clients WHERE trainer_id=$1", [req.session.user.id]);
        const workouts = await db.query("SELECT COUNT(*) FROM workouts WHERE trainer_id=$1", [req.session.user.id]);
        res.render('pages/trainer-dashboard', { 
            title: 'Painel', active: 'dashboard', 
            stats: { clients: clients.rows[0].count, workouts: workouts.rows[0].count } 
        });
    } catch(e) { res.render('pages/error', { message: 'Erro ao carregar dashboard.' }); }
});

router.get('/clients', async (req, res) => {
    const clients = await db.getTrainerClients(req.session.user.id);
    res.render('pages/trainer-clients', { title: 'Alunos', active: 'clients', clients });
});

router.get('/schedule', async (req, res) => {
    // Agenda simplificada para evitar crash
    res.render('pages/trainer-schedule', { title: 'Agenda', active: 'schedule', schedule: {} });
});

router.get('/library', async (req, res) => {
    const exercises = await db.query("SELECT * FROM exercise_library WHERE created_by IS NULL OR created_by=$1", [req.session.user.id]);
    res.render('pages/trainer-library', { title: 'Biblioteca', active: 'library', exercises: exercises.rows });
});

router.get('/financial', (req, res) => res.render('pages/trainer-financial', { title: 'Financeiro', active: 'financial', revenue: 0 }));
router.get('/content', (req, res) => res.render('pages/trainer-content', { title: 'Conteúdos', active: 'content' }));
router.get('/profile', (req, res) => res.render('pages/trainer-profile', { title: 'Perfil', active: 'profile' }));
router.get('/settings', (req, res) => res.render('pages/trainer-settings', { title: 'Configurações', active: 'settings' }));

module.exports = router;
