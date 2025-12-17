const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { body, validationResult } = require('express-validator');

const requireAdminAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const { role, status } = req.session.user;
    if (role === 'superadmin') return next();
    if (role === 'trainer' && status === 'active') return next();
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
                pool.query("SELECT COUNT(*) FROM workouts WHERE trainer_id = ", [trainerId])
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
        const result = await pool.query("SELECT u.id, u.name, u.email, cp.fitness_level, t.name as trainer_name FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id LEFT JOIN users t ON cp.assigned_trainer_id = t.id WHERE u.role = 'client' ORDER BY u.name");
        res.render('pages/admin-clients', { title: 'Gerenciar Clientes', clients: result.rows });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao listar clientes.' });
    }
});

router.get('/clients/:id', async (req, res) => {
    const { id: clientId } = req.params;
    try {
        const clientResult = await pool.query("SELECT u.*, cp.* FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id =  AND u.role = 'client'", [clientId]);
        if (clientResult.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });
        
        const trainersResult = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active' ORDER BY name");
        const workoutsResult = await pool.query("SELECT w.*, u.name as trainer_name FROM workouts w JOIN users u ON w.trainer_id = u.id WHERE w.client_id =  ORDER BY w.created_at DESC", [clientId]);

        res.render('pages/client-details', {
            title: 'Detalhes do Cliente',
            clientProfile: clientResult.rows[0],
            workouts: workoutsResult.rows,
            allTrainers: trainersResult.rows
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes.' });
    }
});

router.post('/workouts/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        const trainerId = req.session.user.id;
        const role = req.session.user.role;
        
        if (role === 'superadmin') {
            await pool.query("DELETE FROM workouts WHERE id = ", [id]);
        } else {
            await pool.query("DELETE FROM workouts WHERE id =  AND trainer_id = ", [id, trainerId]);
        }
        res.redirect('back');
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao excluir treino.' });
    }
});

module.exports = router;
