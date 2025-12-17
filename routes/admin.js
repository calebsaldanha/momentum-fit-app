const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireAdminAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const { role, status } = req.session.user;
    if (role === 'superadmin') return next();
    if (role === 'trainer' && status === 'active') return next();
    return res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

router.get('/clients/:id', requireAdminAuth, async (req, res) => {
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

        if (clientResult.rows.length === 0) {
            return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });
        }

        const trainersResult = await pool.query(
            "SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active' ORDER BY name"
        );

        const workoutsResult = await pool.query(
            "SELECT w.*, u.name as trainer_name FROM workouts w JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC",
            [clientId]
        );

        res.render('pages/client-details', {
            title: `Detalhes de ${clientResult.rows[0].name}`,
            clientProfile: clientResult.rows[0],
            workouts: workoutsResult.rows || [],
            allTrainers: trainersResult.rows || [],
            user: req.session.user,
            csrfToken: req.csrfToken()
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes do cliente.' });
    }
});

router.post('/workouts/:id/delete', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM workouts WHERE id = $1", [id]);
        res.redirect('back');
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao excluir treino.' });
    }
});

module.exports = router;
