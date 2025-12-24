const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireSuperAdminAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') return next();
    res.status(403).render('pages/error', { message: 'Acesso negado.' });
};
router.use(requireSuperAdminAuth);

router.get('/dashboard', async (req, res) => {
    try {
        const stats = {
            trainers: (await pool.query("SELECT COUNT(*) FROM users WHERE role='trainer'")).rows[0].count,
            clients: (await pool.query("SELECT COUNT(*) FROM users WHERE role='client'")).rows[0].count,
            pendingTrainers: (await pool.query("SELECT COUNT(*) FROM users WHERE role='trainer' AND status='pending_approval'")).rows[0].count,
            pendingClients: (await pool.query("SELECT COUNT(*) FROM users WHERE role='client' AND status='pending_approval'")).rows[0].count,
        };
        const pendingTrainers = await pool.query("SELECT * FROM users WHERE role='trainer' AND status='pending_approval' ORDER BY created_at DESC");
        
        res.render('pages/superadmin-dashboard', { 
            title: 'Painel Super Admin', 
            stats, 
            trainers: pendingTrainers.rows,
            currentPage: 'superadmin-dashboard' 
        });
    } catch (err) { res.render('pages/error', { message: 'Erro dash.' }); }
});

router.get('/manage', async (req, res) => {
    try {
        const trainers = await pool.query("SELECT * FROM users WHERE role = 'trainer' ORDER BY created_at DESC");
        const clients = await pool.query("SELECT * FROM users WHERE role = 'client' ORDER BY created_at DESC");
        res.render('pages/superadmin-manage', { 
            title: 'Gerenciar Usuários', 
            trainers: trainers.rows, 
            clients: clients.rows, 
            currentPage: 'superadmin-manage' 
        });
    } catch (err) { res.render('pages/error', { message: 'Erro manage.' }); }
});

// Ações genéricas de status (Aprovar/Suspender)
router.post('/users/:id/status', async (req, res) => {
    try {
        const { action, role } = req.body; // action: 'approve' | 'suspend'
        const newStatus = action === 'approve' ? 'active' : 'rejected';
        
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [newStatus, req.params.id]);
        
        if (action === 'approve') {
             if (role === 'trainer') await notificationService.notifyTrainerApproval(req.params.id);
             // Se for cliente, a notificação de aprovação geralmente vai com atribuição de treino, 
             // mas podemos mandar uma genérica aqui se quiser
        }
        
        res.redirect('/superadmin/manage');
    } catch(e) { 
        console.error(e);
        res.render('pages/error', { message: 'Erro ao alterar status.' }); 
    }
});

router.post('/users/:id/delete', async (req, res) => {
    try {
        const id = req.params.id;
        // Limpezas
        await pool.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [id]);
        await pool.query("DELETE FROM workouts WHERE client_id = $1 OR trainer_id = $1", [id]);
        await pool.query("DELETE FROM client_profiles WHERE user_id = $1", [id]);
        // Se for treinador, desvincular alunos
        await pool.query("UPDATE client_profiles SET assigned_trainer_id = NULL WHERE assigned_trainer_id = $1", [id]);
        
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
        res.redirect('/superadmin/manage');
    } catch(e) { 
        console.error(e);
        res.render('pages/error', { message: 'Erro ao excluir usuário.' }); 
    }
});

module.exports = router;
