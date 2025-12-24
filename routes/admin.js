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

// Middleware para ações críticas (apenas Superadmin)
const requireSuperAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') return next();
    return res.status(403).render('pages/error', { message: 'Permissão exclusiva de Super Admin.' });
};

router.use(requireAdminAuth);

router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';

        // Superadmin tem seu painel próprio, redireciona
        if (isSuper) return res.redirect('/superadmin/dashboard');

        // Dados do Personal
        const clientCount = await pool.query("SELECT COUNT(*) FROM client_profiles WHERE assigned_trainer_id = $1", [userId]);
        const workoutCount = await pool.query("SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", [userId]);
        
        // Clientes Recentes (Apenas os atribuídos ao personal)
        const recentClients = await pool.query(`
            SELECT u.id, u.name, u.email, u.created_at
            FROM users u 
            JOIN client_profiles cp ON u.id = cp.user_id 
            WHERE cp.assigned_trainer_id = $1 
            ORDER BY u.created_at DESC LIMIT 5
        `, [userId]);

        res.render('pages/admin-dashboard', { 
            title: 'Painel do Treinador', 
            stats: { 
                totalClients: clientCount.rows[0].count, 
                totalWorkouts: workoutCount.rows[0].count, 
                weeklyCheckins: 0 
            },
            recentClients: recentClients.rows,
            currentPage: 'admin-dashboard' 
        });
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard.' }); 
    }
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
        
        if (!isSuper) { 
            // Personal vê apenas seus alunos ativos
            query += " AND cp.assigned_trainer_id = $1 AND u.status = 'active'"; 
            params.push(userId); 
        } else {
            // Admin vê tudo, ordenado por status (pendentes primeiro)
            query += " ORDER BY CASE WHEN u.status = 'pending_approval' THEN 0 ELSE 1 END, u.name ASC";
        }

        const result = await pool.query(query, params);
        res.render('pages/admin-clients', { 
            title: isSuper ? 'Gerenciar Todos Clientes' : 'Meus Alunos', 
            clients: result.rows, 
            currentPage: 'admin-clients' 
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao listar clientes.' }); }
});

router.get('/clients/:id', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';

        const client = await pool.query("SELECT u.*, cp.* FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.params.id]);
        if (client.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });

        if (!isSuper && client.rows[0].assigned_trainer_id !== userId) {
            return res.status(403).render('pages/error', { message: 'Você não tem permissão para ver este aluno.' });
        }

        const workouts = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.params.id]);
        const trainers = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active'");
        
        let imc = 0.0;
        const p = client.rows[0];
        if (p.weight && p.height) imc = (p.weight / (p.height * p.height)).toFixed(1);

        res.render('pages/client-details', { 
            title: 'Detalhes do Aluno', 
            clientProfile: p, 
            workouts: workouts.rows, 
            allTrainers: trainers.rows, 
            imc,
            currentPage: 'admin-clients',
            user: req.session.user
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro nos detalhes.' }); }
});

// Ações de Superadmin
router.post('/clients/:id/status', requireSuperAdmin, async (req, res) => {
    const { action } = req.body;
    const clientId = req.params.id;
    try {
        let newStatus = action === 'approve' ? 'active' : 'rejected';
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [newStatus, clientId]);
        
        // Se aprovado, verifica se já tem treinador para notificar adequadamente
        if (action === 'approve') {
             const profile = await pool.query("SELECT assigned_trainer_id FROM client_profiles WHERE user_id = $1", [clientId]);
             if (profile.rows[0].assigned_trainer_id) {
                 const t = await pool.query("SELECT name FROM users WHERE id = $1", [profile.rows[0].assigned_trainer_id]);
                 await notificationService.notifyClientApproval(clientId, t.rows[0].name);
             } else {
                 // Aprovado sem treinador (raro)
                 await notificationService.notifyClientApproval(clientId, "a definir");
             }
        }
        res.redirect('/admin/clients/' + clientId);
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao alterar status.' }); }
});

router.post('/clients/:id/assign', requireSuperAdmin, async (req, res) => {
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
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao atribuir.' }); }
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
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao excluir.' }); }
});

module.exports = router;
