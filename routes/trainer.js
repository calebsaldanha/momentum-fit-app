const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware de Segurança
function requireTrainer(req, res, next) {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'admin')) {
        return next();
    }
    res.redirect('/auth/login');
}
router.use(requireTrainer);

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const clientsCount = await db.query("SELECT COUNT(*) FROM clients WHERE trainer_id = $1", [req.session.user.id]);
        const workoutsCount = await db.query("SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", [req.session.user.id]);
        
        // Alunos recentes
        const recentClients = await db.query(`
            SELECT u.name, u.profile_image, c.id as client_id 
            FROM clients c JOIN users u ON c.user_id = u.id
            WHERE c.trainer_id = $1 ORDER BY c.created_at DESC LIMIT 5
        `, [req.session.user.id]);

        res.render('pages/trainer-dashboard', { 
            title: 'Painel', stats: { clients: clientsCount.rows[0].count, workouts: workoutsCount.rows[0].count },
            recentClients: recentClients.rows
        });
    } catch (e) { res.render('pages/error', { message: 'Erro no Dashboard' }); }
});

// Clients
router.get('/clients', async (req, res) => {
    const clients = await db.getTrainerClients(req.session.user.id);
    res.render('pages/trainer-clients', { title: 'Meus Alunos', clients });
});

// Schedule
router.get('/schedule', async (req, res) => {
    try {
        const workouts = await db.query(`
            SELECT w.*, u.name as client_name 
            FROM workouts w JOIN clients c ON w.client_id = c.id JOIN users u ON c.user_id = u.id
            WHERE w.trainer_id = $1
        `, [req.session.user.id]);
        
        // Agrupamento simplificado para evitar erro se lógica complexa falhar
        const schedule = { 'Segunda': [], 'Terça': [], 'Quarta': [], 'Quinta': [], 'Sexta': [], 'Sábado': [], 'Domingo': [], 'Flexível': [] };
        workouts.rows.forEach(w => {
            let d = w.day_of_week ? w.day_of_week.split('-')[0] : 'Flexível';
            if(schedule[d]) schedule[d].push(w); else schedule['Flexível'].push(w);
        });

        res.render('pages/trainer-schedule', { title: 'Agenda', schedule });
    } catch(e) { console.error(e); res.render('pages/error', { message: 'Erro na Agenda' }); }
});

// Rotas Faltantes (Stubs para carregar a página sem erro)
router.get('/financial', (req, res) => {
    res.render('pages/trainer-financial', { title: 'Financeiro', revenue: 0 }); 
});

router.get('/library', async (req, res) => {
    // Buscar exercícios reais para a biblioteca não ficar vazia
    const exercises = await db.query("SELECT * FROM exercise_library WHERE (created_by IS NULL OR created_by = $1)", [req.session.user.id]);
    res.render('pages/trainer-library', { title: 'Biblioteca de Exercícios', exercises: exercises.rows });
});

router.get('/content', (req, res) => {
    res.render('pages/trainer-content', { title: 'Meus Conteúdos' });
});

router.get('/settings', (req, res) => {
    res.render('pages/trainer-settings', { title: 'Configurações' });
});

router.get('/profile', async (req, res) => {
    // Puxar dados completos
    const profile = await db.query("SELECT * FROM trainers WHERE user_id = $1", [req.session.user.id]);
    res.render('pages/trainer-profile', { title: 'Meu Perfil', trainerData: profile.rows[0] || {} });
});

module.exports = router;
