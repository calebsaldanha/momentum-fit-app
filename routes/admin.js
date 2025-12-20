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
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';

        let clientCountQuery, checkinCountQuery, clientParams = [], checkinParams = [];

        if (isSuper) {
            clientCountQuery = "SELECT COUNT(*) FROM users WHERE role = 'client'";
            checkinCountQuery = "SELECT COUNT(*) FROM workout_checkins WHERE created_at >= NOW() - INTERVAL '7 days'";
        } else {
            // Treinador vê apenas seus clientes atribuídos
            clientCountQuery = "SELECT COUNT(*) FROM client_profiles WHERE assigned_trainer_id = $1";
            clientParams = [userId];
            // Treinador vê checkins apenas dos treinos que ELE criou ou de seus alunos
            checkinCountQuery = `
                SELECT COUNT(wc.id) 
                FROM workout_checkins wc 
                JOIN workouts w ON wc.workout_id = w.id 
                WHERE w.trainer_id = $1 AND wc.created_at >= NOW() - INTERVAL '7 days'
            `;
            checkinParams = [userId];
        }

        const [clients, workouts, checkins] = await Promise.all([
            pool.query(clientCountQuery, clientParams),
            pool.query("SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", [userId]),
            pool.query(checkinCountQuery, checkinParams)
        ]);
        
        // Clientes recentes (global para superadmin, filtrado para trainer)
        let recentClientsQuery = "SELECT id, name, email FROM users WHERE role = 'client' ORDER BY created_at DESC LIMIT 5";
        let recentClientsParams = [];
        if (!isSuper) {
            recentClientsQuery = `
                SELECT u.id, u.name, u.email 
                FROM users u 
                JOIN client_profiles cp ON u.id = cp.user_id 
                WHERE cp.assigned_trainer_id = $1 
                ORDER BY u.created_at DESC LIMIT 5`;
            recentClientsParams = [userId];
        }
        const recentClients = await pool.query(recentClientsQuery, recentClientsParams);

        res.render('pages/admin-dashboard', { 
            title: 'Painel Geral', 
            stats: { 
                totalClients: clients.rows[0].count, 
                totalWorkouts: workouts.rows[0].count, 
                weeklyCheckins: checkins.rows[0].count 
            },
            recentClients: recentClients.rows,
            currentPage: 'admin-dashboard' 
        });
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro no dashboard.' }); 
    }
});

router.get('/clients', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';
        
        let query = `
            SELECT u.*, cp.fitness_level, t.name as trainer_name 
            FROM users u 
            LEFT JOIN client_profiles cp ON u.id = cp.user_id 
            LEFT JOIN users t ON cp.assigned_trainer_id = t.id
            WHERE u.role = 'client'
        `;
        
        const params = [];
        if (!isSuper) {
            query += " AND cp.assigned_trainer_id = $1";
            params.push(userId);
        }
        query += " ORDER BY u.name";

        const result = await pool.query(query, params);
        res.render('pages/admin-clients', { title: 'Gerenciar Clientes', clients: result.rows, currentPage: 'admin-clients' });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao listar clientes.' }); }
});

router.get('/clients/:id', async (req, res) => {
    try {
        const client = await pool.query("SELECT u.*, cp.* FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.params.id]);
        if (client.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });

        const workouts = await pool.query("SELECT w.*, u.name as trainer_name FROM workouts w JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC", [req.params.id]);
        
        // Apenas Superadmin ou o próprio treinador podem ver a lista completa de treinadores para reatribuição
        const trainers = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active' ORDER BY name");
        
        res.render('pages/client-details', { 
            title: 'Detalhes do Cliente', 
            clientProfile: client.rows[0], 
            workouts: workouts.rows, 
            allTrainers: trainers.rows, 
            currentPage: 'admin-clients' 
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro nos detalhes.' }); }
});

// NOVA ROTA: Atribuir Treinador
router.post('/clients/:id/assign', async (req, res) => {
    try {
        const { trainer_id } = req.body;
        await pool.query("UPDATE client_profiles SET assigned_trainer_id = $1 WHERE user_id = $2", [trainer_id || null, req.params.id]);
        
        // Opcional: Notificar o treinador e o cliente
        // const notificationService = require('../utils/notificationService');
        // await notificationService.notifyClientAssignment(...) 

        res.redirect(`/admin/clients/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao atribuir treinador.' });
    }
});

module.exports = router;
