const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireAdminAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const { role, status } = req.session.user;
    if (role === 'superadmin' || (role === 'trainer' && status === 'active')) return next();
    return res.status(403).render('pages/error', { message: 'Acesso negado.' });
};
router.use(requireAdminAuth);

router.get('/dashboard', async (req, res) => {
    try {
        const [clients, workouts, checkins] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'"),
            pool.query("SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", [req.session.user.id]),
            pool.query("SELECT COUNT(*) FROM workout_checkins WHERE created_at >= NOW() - INTERVAL '7 days'")
        ]);
        const recentClients = await pool.query("SELECT id, name, email FROM users WHERE role = 'client' ORDER BY created_at DESC LIMIT 5");
        res.render('pages/admin-dashboard', { 
            title: 'Painel Geral', 
            stats: { totalClients: clients.rows[0].count, totalWorkouts: workouts.rows[0].count, weeklyCheckins: checkins.rows[0].count },
            recentClients: recentClients.rows,
            currentPage: 'admin-dashboard' 
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro no dashboard.' }); }
});

router.get('/clients', async (req, res) => {
    try {
        const result = await pool.query("SELECT u.*, cp.fitness_level FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.role = 'client' ORDER BY u.name");
        res.render('pages/admin-clients', { title: 'Gerenciar Clientes', clients: result.rows, currentPage: 'admin-clients' });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao listar clientes.' }); }
});

router.get('/clients/:id', async (req, res) => {
    try {
        const client = await pool.query("SELECT u.*, cp.* FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.params.id]);
        const workouts = await pool.query("SELECT w.*, u.name as trainer_name FROM workouts w JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1", [req.params.id]);
        const trainers = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active'");
        res.render('pages/client-details', { title: 'Detalhes do Cliente', clientProfile: client.rows[0], workouts: workouts.rows, allTrainers: trainers.rows, currentPage: 'admin-clients' });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro nos detalhes.' }); }
});
module.exports = router;
