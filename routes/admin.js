const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireAdminAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const { role, status } = req.session.user;
    if (role === 'superadmin' || (role === 'trainer' && status === 'active')) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

router.use(requireAdminAuth);

router.get('/dashboard', async (req, res) => {
    try {
        const trainerId = req.session.user.id;
        const [totalClientsRes, totalWorkoutsRes, weeklyCheckinsRes] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'"),
            (req.session.user.role === 'superadmin' ?
                pool.query("SELECT COUNT(*) FROM workouts") :
                pool.query("SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", [trainerId])
            ),
            pool.query("SELECT COUNT(*) FROM workout_checkins WHERE created_at >= NOW() - INTERVAL '7 days'")
        ]);
        const stats = {
            totalClients: totalClientsRes.rows[0].count || 0,
            totalWorkouts: totalWorkoutsRes.rows[0].count || 0,
            weeklyCheckins: weeklyCheckinsRes.rows[0].count || 0,
        };
        const recentClientsRes = await pool.query("SELECT id, name, email, created_at FROM users WHERE role = 'client' ORDER BY created_at DESC LIMIT 5");
        res.render('pages/admin-dashboard', { title: 'Dashboard Admin', stats, recentClients: recentClientsRes.rows });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard.' });
    }
});

router.get('/clients', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.email, u.created_at, cp.fitness_level, t.name as trainer_name 
            FROM users u 
            LEFT JOIN client_profiles cp ON u.id = cp.user_id 
            LEFT JOIN users t ON cp.assigned_trainer_id = t.id 
            WHERE u.role = 'client' 
            ORDER BY u.name
        `);
        res.render('pages/admin-clients', { title: 'Gerenciar Clientes', clients: result.rows });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao listar clientes.' });
    }
});

router.get('/clients/:id', async (req, res) => {
    const { id: clientId } = req.params;
    try {
        const clientQuery = `
            SELECT u.id, u.name, u.email, u.created_at, 
                   cp.age, cp.weight, cp.height, cp.fitness_level, 
                   cp.goals, cp.medical_conditions,
                   cp.assigned_trainer_id,
                   cp.training_days, cp.training_duration, cp.equipment, cp.activity_level
            FROM users u
            LEFT JOIN client_profiles cp ON u.id = cp.user_id
            WHERE u.id = $1 AND u.role = 'client';
        `;
        const clientResult = await pool.query(clientQuery, [clientId]);

        if (clientResult.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });

        const trainersResult = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active' ORDER BY name");
        const workoutsResult = await pool.query(`
            SELECT w.*, u.name as trainer_name 
            FROM workouts w 
            JOIN users u ON w.trainer_id = u.id 
            WHERE w.client_id = $1 
            ORDER BY w.created_at DESC
        `, [clientId]);

        res.render('pages/client-details', {
            title: 'Detalhes do Cliente',
            clientProfile: clientResult.rows[0],
            workouts: workoutsResult.rows || [],
            allTrainers: trainersResult.rows || []
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes.' });
    }
});

router.post('/clients/:id/assign', async (req, res) => {
    const { id: clientId } = req.params;
    const { trainer_id } = req.body;
    try {
        await pool.query('UPDATE client_profiles SET assigned_trainer_id = $1 WHERE user_id = $2', [trainer_id, clientId]);
        res.redirect(`/admin/clients/${clientId}`);
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao atribuir personal.' });
    }
});

router.post('/workouts/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM workouts WHERE id = $1", [id]);
        res.redirect('back');
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao excluir treino.' });
    }
});

module.exports = router;
