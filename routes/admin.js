const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

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

        let clientCountQuery = isSuper ? "SELECT COUNT(*) FROM users WHERE role = 'client'" : "SELECT COUNT(*) FROM client_profiles WHERE assigned_trainer_id = $1";
        let clientParams = isSuper ? [] : [userId];
        
        // Evita erro se tabela checkin não existir
        const [clients, workouts] = await Promise.all([
            pool.query(clientCountQuery, clientParams),
            pool.query("SELECT COUNT(*) FROM workouts", [])
        ]);
        
        let recentQuery = isSuper 
            ? "SELECT u.id, u.name, u.email, u.created_at FROM users u WHERE u.role='client' ORDER BY u.created_at DESC LIMIT 5"
            : "SELECT u.id, u.name, u.email, u.created_at FROM users u JOIN client_profiles cp ON u.id=cp.user_id WHERE cp.assigned_trainer_id=$1 ORDER BY u.created_at DESC LIMIT 5";
        let recentParams = isSuper ? [] : [userId];

        const recentClients = await pool.query(recentQuery, recentParams);

        res.render('pages/admin-dashboard', { 
            title: 'Painel Geral', 
            stats: { totalClients: clients.rows[0].count, totalWorkouts: workouts.rows[0].count, weeklyCheckins: 0 },
            recentClients: recentClients.rows,
            currentPage: 'admin-dashboard' 
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro dash.' }); }
});

router.get('/clients', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';
        
        let query = `
            SELECT u.id, u.name, u.email, u.status, cp.fitness_level, t.name as trainer_name 
            FROM users u 
            LEFT JOIN client_profiles cp ON u.id = cp.user_id 
            LEFT JOIN users t ON cp.assigned_trainer_id = t.id
            WHERE u.role = 'client'
        `;
        const params = [];
        if (!isSuper) { query += " AND cp.assigned_trainer_id = $1"; params.push(userId); }
        query += " ORDER BY CASE WHEN u.status = 'pending_approval' THEN 0 ELSE 1 END, u.name ASC";

        const result = await pool.query(query, params);
        res.render('pages/admin-clients', { title: 'Gerenciar Clientes', clients: result.rows, currentPage: 'admin-clients' });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro clientes.' }); }
});

router.get('/clients/:id', async (req, res) => {
    try {
        const client = await pool.query("SELECT u.*, cp.* FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.params.id]);
        if (client.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });

        const workouts = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.params.id]);
        const trainers = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active'");
        
        // CÁLCULO IMC
        let imc = 0.0;
        const p = client.rows[0];
        if (p.weight && p.height) imc = (parseFloat(p.weight) / (parseFloat(p.height) * parseFloat(p.height))).toFixed(1);

        res.render('pages/client-details', { 
            title: 'Detalhes do Cliente', clientProfile: p, workouts: workouts.rows, allTrainers: trainers.rows, 
            imc: imc, 
            currentPage: 'admin-clients', user: req.session.user 
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro detalhes.' }); }
});

router.post('/clients/:id/assign', async (req, res) => {
    try {
        const { trainer_id } = req.body;
        const clientId = req.params.id;
        await pool.query("UPDATE client_profiles SET assigned_trainer_id = $1 WHERE user_id = $2", [trainer_id, clientId]);
        await pool.query("UPDATE users SET status = 'active' WHERE id = $1", [clientId]); 
        
        const trainerRes = await pool.query("SELECT name FROM users WHERE id = $1", [trainer_id]);
        await notificationService.notifyClientApproval(clientId, trainerRes.rows[0].name);
        
        if (trainer_id != req.session.user.id) {
            const clientRes = await pool.query("SELECT name FROM users WHERE id = $1", [clientId]);
            await notificationService.notifyTrainerAssignment(trainer_id, clientRes.rows[0].name, clientId);
        }
        res.redirect(`/admin/clients/${clientId}`);
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro atribuição.' }); }
});

module.exports = router;
