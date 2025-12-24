const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireAdminAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const { role, status } = req.session.user;
    // Permite SuperAdmin ou Treinador Ativo
    if (role === 'superadmin' || (role === 'trainer' && status === 'active')) return next();
    return res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

// Middleware Extra: Apenas SuperAdmin (Para rotas críticas de alteração)
const requireSuperAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') return next();
    return res.status(403).render('pages/error', { message: 'Ação permitida apenas para Administradores.' });
};

router.use(requireAdminAuth);

router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';

        // Redireciona Super Admin para o painel correto
        if (isSuper) return res.redirect('/superadmin/dashboard');

        // Dashboard do Treinador
        // 1. Contagem de Alunos Ativos vinculados
        const clientCount = await pool.query(
            "SELECT COUNT(*) FROM client_profiles WHERE assigned_trainer_id = $1", 
            [userId]
        );

        // 2. Contagem de Treinos criados pelo treinador
        const workoutCount = await pool.query(
            "SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", 
            [userId]
        );

        // 3. Alunos Recentes
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
                weeklyCheckins: 0 // Placeholder até implementarmos checkins
            },
            recentClients: recentClients.rows,
            currentPage: 'admin-dashboard' 
        });
    } catch (err) { 
        console.error("Erro Dashboard:", err);
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
            // TREINADOR: Vê APENAS seus alunos ATIVOS.
            query += " AND cp.assigned_trainer_id = $1 AND u.status = 'active'"; 
            params.push(userId); 
        } else {
            // ADMIN: Vê tudo e ordena pendentes primeiro
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

        // Segurança: Se for Treinador, só pode ver se for o responsável
        if (!isSuper) {
            if (client.rows[0].assigned_trainer_id !== userId) {
                return res.status(403).render('pages/error', { message: 'Acesso restrito.' });
            }
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
    } catch (err) { console.error(err); res.status(500).render('pages/error', { message: 'Erro detalhes.' }); }
});

// Ações restritas ao Super Admin
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
                 if(t.rows.length) trainerName = t.rows[0].name;
             }
             await notificationService.notifyClientApproval(clientId, trainerName);
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
        await pool.query("DELETE FROM workouts WHERE client_id = $1", [id]);
        await pool.query("DELETE FROM client_profiles WHERE user_id = $1", [id]);
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
        res.redirect('/admin/clients');
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao excluir.' }); }
});

module.exports = router;
