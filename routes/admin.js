const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

// Middleware: Permite SuperAdmin e Treinadores Ativos
const requireAdminAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const { role, status } = req.session.user;
    if (role === 'superadmin' || (role === 'trainer' && status === 'active')) return next();
    return res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

const requireSuperAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') return next();
    return res.status(403).render('pages/error', { message: 'Permissão exclusiva de Super Admin.' });
};

router.use(requireAdminAuth);

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        const clientCount = await pool.query("SELECT COUNT(*) FROM client_profiles WHERE assigned_trainer_id = $1", [userId]);
        const workoutCount = await pool.query("SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", [userId]);
        
        const recentClients = await pool.query(`
            SELECT u.id, u.name, u.email, u.created_at
            FROM users u 
            JOIN client_profiles cp ON u.id = cp.user_id 
            WHERE cp.assigned_trainer_id = $1 
            ORDER BY u.created_at DESC LIMIT 5
        `, [userId]);

        res.render('pages/admin-dashboard', { 
            title: 'Meu Painel (Operacional)', 
            stats: { 
                totalClients: clientCount.rows[0].count, 
                totalWorkouts: workoutCount.rows[0].count, 
                weeklyCheckins: 0 
            },
            recentClients: recentClients.rows,
            currentPage: 'admin-dashboard' 
        });
    } catch (err) { console.error(err); res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard.' }); }
});

// Listar Alunos
router.get('/clients', async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        let query = `
            SELECT u.id, u.name, u.email, u.status, cp.fitness_level, t.name as trainer_name 
            FROM users u 
            LEFT JOIN client_profiles cp ON u.id = cp.user_id 
            LEFT JOIN users t ON cp.assigned_trainer_id = t.id
            WHERE u.role = 'client' AND cp.assigned_trainer_id = $1
            ORDER BY u.name ASC
        `;
        
        const result = await pool.query(query, [userId]);
        
        res.render('pages/admin-clients', { 
            title: 'Meus Alunos', 
            clients: result.rows, 
            currentPage: 'admin-clients' 
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao listar alunos.' }); }
});

// Detalhes do Aluno
router.get('/clients/:id', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';

        const client = await pool.query("SELECT u.*, cp.* FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.params.id]);
        if (client.rows.length === 0) return res.status(404).render('pages/error', { message: 'Aluno não encontrado.' });

        if (!isSuper && client.rows[0].assigned_trainer_id !== userId) {
            return res.status(403).render('pages/error', { message: 'Acesso restrito.' });
        }

        const workouts = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.params.id]);
        const trainers = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active'");
        
        const p = client.rows[0];
        
        // CÁLCULO IMC ROBUSTO (Admin)
        let imc = '--';
        const w = parseFloat(p.weight);
        const h = parseFloat(p.height);
        if (w > 0 && h > 0) {
            imc = (w / (h * h)).toFixed(1);
        }

        res.render('pages/client-details', { 
            title: 'Detalhes do Aluno', 
            clientProfile: p, 
            workouts: workouts.rows, 
            allTrainers: trainers.rows, 
            imc,
            currentPage: 'admin-clients',
            user: req.session.user
        });
    } catch (err) { console.error(err); res.status(500).render('pages/error', { message: 'Erro detalhes.' }); }
});

// Ações POST (Status, Assign, Delete)
router.post('/clients/:id/status', requireSuperAdmin, async (req, res) => {
    const { action } = req.body;
    const clientId = req.params.id;
    try {
        let newStatus = action === 'approve' ? 'active' : (action === 'suspend' ? 'rejected' : 'pending_approval');
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [newStatus, clientId]);
        
        if (action === 'approve') {
             const profile = await pool.query("SELECT assigned_trainer_id FROM client_profiles WHERE user_id = $1", [clientId]);
             let trainerName = 'a definir';
             if (profile.rows[0].assigned_trainer_id) {
                 const t = await pool.query("SELECT name FROM users WHERE id = $1", [profile.rows[0].assigned_trainer_id]);
                 if(t.rows.length > 0) trainerName = t.rows[0].name;
             }
             await notificationService.notifyClientApproval(clientId, trainerName);
        }
        res.redirect('/admin/clients/' + clientId);
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro status.' }); }
});

router.post('/clients/:id/assign', requireSuperAdmin, async (req, res) => {
    try {
        const { trainer_id } = req.body;
        const clientId = req.params.id;
        
        await pool.query("UPDATE client_profiles SET assigned_trainer_id = $1 WHERE user_id = $2", [trainer_id, clientId]);
        await pool.query("UPDATE users SET status = 'active' WHERE id = $1", [clientId]);
        
        const trainerRes = await pool.query("SELECT name FROM users WHERE id = $1", [trainer_id]);
        const trainerName = trainerRes.rows[0].name;

        await notificationService.notifyClientApproval(clientId, trainerName);
        
        if (trainer_id != req.session.user.id) {
            const clientRes = await pool.query("SELECT name FROM users WHERE id = $1", [clientId]);
            await notificationService.notifyTrainerAssignment(trainer_id, clientRes.rows[0].name, clientId);
        }
        res.redirect(`/admin/clients/${clientId}`);
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro atribuir.' }); }
});

router.post('/clients/:id/delete', requireSuperAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [id]);
        await pool.query("DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE client_id = $1)", [id]);
        await pool.query("DELETE FROM workouts WHERE client_id = $1", [id]);
        await pool.query("DELETE FROM client_profiles WHERE user_id = $1", [id]);
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
        res.redirect('/admin/clients');
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro excluir.' }); }
});

module.exports = router;
