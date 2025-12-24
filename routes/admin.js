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
    // Mantendo dashboard básico
    try {
        const clients = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'");
        res.render('pages/admin-dashboard', { 
            title: 'Painel Geral', stats: { totalClients: clients.rows[0].count, totalWorkouts: 0, weeklyCheckins: 0 }, 
            recentClients: [], currentPage: 'admin-dashboard' 
        });
    } catch(e) { res.render('pages/error', { message: 'Erro dash' }); }
});

// Listagem de Clientes
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
        // Se for Trainer comum, vê apenas seus e pendentes (para pegar novos)
        if (!isSuper) { 
            query += " AND (cp.assigned_trainer_id = $1 OR u.status = 'pending_approval' OR cp.assigned_trainer_id IS NULL)"; 
            params.push(userId); 
        }
        query += " ORDER BY CASE WHEN u.status = 'pending_approval' THEN 0 ELSE 1 END, u.name ASC";

        const result = await pool.query(query, params);
        res.render('pages/admin-clients', { title: 'Gerenciar Clientes', clients: result.rows, currentPage: 'admin-clients' });
    } catch (err) { res.render('pages/error', { message: 'Erro clientes.' }); }
});

// Detalhes Completos
router.get('/clients/:id', async (req, res) => {
    try {
        const client = await pool.query("SELECT u.*, cp.* FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.params.id]);
        if (client.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });

        const workouts = await pool.query("SELECT * FROM workouts WHERE client_id = $1", [req.params.id]);
        const trainers = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active'");
        
        // Calculo IMC para exibição
        let imc = 0.0;
        const p = client.rows[0];
        if (p.weight && p.height) imc = (p.weight / (p.height * p.height)).toFixed(1);

        res.render('pages/client-details', { 
            title: 'Detalhes', 
            clientProfile: p, 
            workouts: workouts.rows, 
            allTrainers: trainers.rows, 
            imc,
            currentPage: 'admin-clients' 
        });
    } catch (err) { console.error(err); res.render('pages/error', { message: 'Erro detalhes.' }); }
});

// Ação: Mudar Status (Aprovar/Suspender)
router.post('/clients/:id/status', async (req, res) => {
    const { status, action } = req.body; // status: 'active', 'rejected'. action: 'approve', 'suspend'
    const clientId = req.params.id;
    try {
        let newStatus = status;
        if (action === 'approve') newStatus = 'active';
        if (action === 'suspend') newStatus = 'rejected';

        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [newStatus, clientId]);

        if (action === 'approve') {
             // Tenta pegar o nome do treinador se já atribuído
             const profile = await pool.query("SELECT assigned_trainer_id FROM client_profiles WHERE user_id = $1", [clientId]);
             let trainerName = 'um treinador';
             if (profile.rows[0].assigned_trainer_id) {
                 const t = await pool.query("SELECT name FROM users WHERE id = $1", [profile.rows[0].assigned_trainer_id]);
                 if(t.rows.length) trainerName = t.rows[0].name;
             }
             await notificationService.notifyClientApproval(clientId, trainerName);
        }

        res.redirect('/admin/clients/' + clientId);
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao alterar status.' }); }
});

// Ação: Atribuir Treinador (Também aprova)
router.post('/clients/:id/assign', async (req, res) => {
    try {
        const { trainer_id } = req.body;
        const clientId = req.params.id;
        
        await pool.query("UPDATE client_profiles SET assigned_trainer_id = $1 WHERE user_id = $2", [trainer_id, clientId]);
        await pool.query("UPDATE users SET status = 'active' WHERE id = $1", [clientId]); // Garante aprovação

        const trainerRes = await pool.query("SELECT name FROM users WHERE id = $1", [trainer_id]);
        const trainerName = trainerRes.rows[0].name;
        
        await notificationService.notifyClientApproval(clientId, trainerName);
        if (trainer_id != req.session.user.id) {
            const clientRes = await pool.query("SELECT name FROM users WHERE id = $1", [clientId]);
            await notificationService.notifyTrainerAssignment(trainer_id, clientRes.rows[0].name, clientId);
        }

        res.redirect(`/admin/clients/${clientId}`);
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao atribuir.' }); }
});

// Ação: Excluir Cliente
router.post('/clients/:id/delete', async (req, res) => {
    const clientId = req.params.id;
    try {
        // Cascading delete should handle relations if DB configured, otherwise manual:
        await pool.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [clientId]);
        await pool.query("DELETE FROM workouts WHERE client_id = $1", [clientId]);
        await pool.query("DELETE FROM client_profiles WHERE user_id = $1", [clientId]);
        await pool.query("DELETE FROM users WHERE id = $1", [clientId]);
        res.redirect('/admin/clients');
    } catch (err) { console.error(err); res.status(500).render('pages/error', { message: 'Erro ao excluir.' }); }
});

module.exports = router;
