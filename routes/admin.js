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
    // ... Dashboard mantido simples para brevidade (igual original)
    res.render('pages/admin-dashboard', { title: 'Painel', stats: { totalClients:0, totalWorkouts:0, weeklyCheckins:0 }, recentClients:[], currentPage: 'admin-dashboard' });
});

router.get('/clients', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';
        // Inclui status para ver pendentes
        let query = `
            SELECT u.*, cp.fitness_level, t.name as trainer_name 
            FROM users u 
            LEFT JOIN client_profiles cp ON u.id = cp.user_id 
            LEFT JOIN users t ON cp.assigned_trainer_id = t.id
            WHERE u.role = 'client'
        `;
        const params = [];
        if (!isSuper) { query += " AND (cp.assigned_trainer_id = $1 OR u.status = 'pending_approval')"; params.push(userId); } // Trainer vê seus alunos e pendentes (simplificado)
        query += " ORDER BY u.status ASC, u.name ASC"; // Pendentes primeiro

        const result = await pool.query(query, params);
        res.render('pages/admin-clients', { title: 'Gerenciar Clientes', clients: result.rows, currentPage: 'admin-clients' });
    } catch (err) { res.render('pages/error', { message: 'Erro clientes.' }); }
});

router.get('/clients/:id', async (req, res) => {
    try {
        const client = await pool.query("SELECT u.*, cp.* FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.params.id]);
        if (client.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });

        const workouts = await pool.query("SELECT * FROM workouts WHERE client_id = $1", [req.params.id]);
        const trainers = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active'");
        
        res.render('pages/client-details', { title: 'Detalhes', clientProfile: client.rows[0], workouts: workouts.rows, allTrainers: trainers.rows, currentPage: 'admin-clients' });
    } catch (err) { res.render('pages/error', { message: 'Erro detalhes.' }); }
});

router.post('/clients/:id/assign', async (req, res) => {
    try {
        const { trainer_id } = req.body;
        const clientId = req.params.id;
        
        // 1. Atribui Treinador
        await pool.query("UPDATE client_profiles SET assigned_trainer_id = $1 WHERE user_id = $2", [trainer_id, clientId]);
        
        // 2. APROVA O CLIENTE (Muda status para active)
        await pool.query("UPDATE users SET status = 'active' WHERE id = $1", [clientId]);

        // 3. Notificações
        const trainerRes = await pool.query("SELECT name FROM users WHERE id = $1", [trainer_id]);
        const trainerName = trainerRes.rows[0].name;
        
        // Avisa o cliente que ele foi aprovado
        await notificationService.notifyClientApproval(clientId, trainerName);
        
        // Avisa o treinador (se não for auto-atribuição)
        if (trainer_id != req.session.user.id) {
            const clientRes = await pool.query("SELECT name FROM users WHERE id = $1", [clientId]);
            await notificationService.notifyTrainerAssignment(trainer_id, clientRes.rows[0].name, clientId);
        }

        res.redirect(`/admin/clients/${clientId}`);
    } catch (err) { console.error(err); res.status(500).render('pages/error', { message: 'Erro ao aprovar.' }); }
});

module.exports = router;
