const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { body, validationResult } = require('express-validator');
const notificationService = require('../utils/notificationService');

const requireAdminAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    const { role, status } = req.session.user;
    if (role === 'superadmin') {
        return next();
    }
    if (role === 'trainer') {
        if (status === 'active') {
            return next();
        } else {
            return res.redirect('/trainer/profile');
        }
    }
    return res.status(403).render('pages/error', { message: 'Acesso negado. Você não tem permissão para ver esta página.' });
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

        const recentClientsRes = await pool.query(`
            SELECT u.id, u.name, u.email, u.created_at
            FROM users u 
            WHERE u.role = 'client' 
            ORDER BY u.created_at DESC 
            LIMIT 5;
        `);

        res.render('pages/admin-dashboard', {
            title: 'Dashboard Admin - Momentum Fit',
            stats,
            recentClients: recentClientsRes.rows
        });
    } catch (err) {
        console.error("Erro ao carregar dashboard do admin:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível carregar o dashboard.' });
    }
});

router.get('/clients', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.email, u.created_at, cp.fitness_level, cp.assigned_trainer_id, t.name as trainer_name
            FROM users u
            LEFT JOIN client_profiles cp ON u.id = cp.user_id
            LEFT JOIN users t ON cp.assigned_trainer_id = t.id
            WHERE u.role = 'client'
            ORDER BY u.name;
        `);
        res.render('pages/admin-clients', {
            title: 'Gerenciar Clientes - Momentum Fit',
            clients: result.rows
        });
    } catch (err) {
        console.error("Erro ao listar clientes:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível carregar a lista de clientes.' });
    }
});

router.get('/clients/:id', async (req, res) => {
    const { id: clientId } = req.params;
    const { id: trainerId, role: userRole } = req.session.user;

    if (isNaN(parseInt(clientId))) {
        return res.status(400).render('pages/error', { message: 'ID de cliente inválido.' });
    }

    try {
        const clientQuery = `
            SELECT u.id, u.name, u.email, u.created_at, 
                   cp.age, cp.weight, cp.height, cp.fitness_level, 
                   cp.goals, cp.medical_conditions,
                   cp.assigned_trainer_id
            FROM users u
            LEFT JOIN client_profiles cp ON u.id = cp.user_id
            WHERE u.id = $1 AND u.role = 'client';
        `;
        const clientResult = await pool.query(clientQuery, [clientId]);

        if (clientResult.rows.length === 0) {
            return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });
        }
        
        const clientData = clientResult.rows[0];

        const trainersResult = await pool.query(
            "SELECT id, name FROM users WHERE role = 'trainer' AND status = 'active' ORDER BY name"
        );

        let workoutsQuery;
        const queryParams = [clientId];
        let queryBase = `
            SELECT w.*, u_trainer.name as trainer_name, 
                   (SELECT COUNT(*) FROM workout_checkins wc WHERE wc.workout_id = w.id) as total_checkins,
                   (SELECT COUNT(*) FROM workout_checkins wc WHERE wc.workout_id = w.id AND wc.completed = true) as completed_checkins
            FROM workouts w 
            LEFT JOIN users u_trainer ON w.trainer_id = u_trainer.id
            WHERE w.client_id = $1
        `;
        if (userRole !== 'superadmin') {
            queryBase += " AND w.trainer_id = $2";
            queryParams.push(trainerId);
        }
        queryBase += " ORDER BY w.created_at DESC;";
        workoutsQuery = queryBase;
        
        const workoutsResult = await pool.query(workoutsQuery, queryParams);

        res.render('pages/client-details', {
            title: `Detalhes de ${clientData.name} - Momentum Fit`,
            clientProfile: clientData,
            workouts: workoutsResult.rows,
            allTrainers: trainersResult.rows
        });

    } catch (err) {
        console.error(`Erro ao buscar detalhes do cliente (ID: ${clientId}):`, err);
        res.status(500).render('pages/error', { message: 'Ocorreu um erro ao carregar os detalhes do cliente.' });
    }
});

router.post('/clients/:id/assign', requireAdminAuth, [
    body('trainer_id').isInt({ min: 1 }).withMessage('Personal inválido.')
], async (req, res) => {
    
    if (req.session.user.role !== 'superadmin') {
        return res.status(403).render('pages/error', { message: 'Apenas Super Admins podem atribuir clientes.' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.redirect('back');
    }

    const { id: clientId } = req.params;
    const { trainer_id } = req.body;

    try {
        await pool.query(
            'UPDATE client_profiles SET assigned_trainer_id = $1 WHERE user_id = $2',
            [trainer_id, clientId]
        );
        
        const client = await pool.query('SELECT name FROM users WHERE id = $1', [clientId]);
        const clientName = client.rows[0] ? client.rows[0].name : 'Um novo cliente';

        await notificationService.notifyClientAssignment(clientName, clientId, trainer_id);
        
        res.redirect(`/admin/clients/${clientId}`);

    } catch (err) {
        console.error('Erro ao atribuir personal:', err);
        res.status(500).render('pages/error', { message: 'Ocorreu um erro ao atribuir o personal.' });
    }
});


module.exports = router;
