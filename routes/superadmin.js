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
        res.render('pages/superadmin-dashboard', { title: 'Painel Super Admin', stats, currentPage: 'superadmin-dashboard' });
    } catch (err) { res.render('pages/error', { message: 'Erro dash.' }); }
});

router.get('/manage', async (req, res) => {
    try {
        const trainers = await pool.query("SELECT * FROM users WHERE role = 'trainer' ORDER BY created_at DESC");
        const clients = await pool.query("SELECT * FROM users WHERE role = 'client' ORDER BY created_at DESC");
        res.render('pages/superadmin-manage', { title: 'Gerenciar Usuários', trainers: trainers.rows, clients: clients.rows, currentPage: 'superadmin-manage' });
    } catch (err) { res.render('pages/error', { message: 'Erro manage.' }); }
});

// Detalhes do Treinador
router.get('/trainers/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users WHERE id = $1 AND role = 'trainer'", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Não encontrado' });
        
        const clientsRes = await pool.query("SELECT u.name, u.email FROM users u JOIN client_profiles cp ON u.id=cp.user_id WHERE cp.assigned_trainer_id=$1", [req.params.id]);

        res.render('pages/trainer-details', { title: 'Detalhes Treinador', trainer: result.rows[0], clients: clientsRes.rows, currentPage: 'superadmin-manage' });
    } catch (err) { res.render('pages/error', { message: 'Erro detalhes.' }); }
});

// Ações Treinador
router.post('/trainers/:id/status', async (req, res) => {
    try {
        const { action } = req.body;
        const newStatus = action === 'approve' ? 'active' : 'rejected';
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [newStatus, req.params.id]);
        
        if (action === 'approve') await notificationService.notifyTrainerApproval(req.params.id);
        
        res.redirect('/superadmin/trainers/' + req.params.id);
    } catch(e) { res.render('pages/error', { message: 'Erro status.' }); }
});

router.post('/trainers/:id/delete', async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query("UPDATE client_profiles SET assigned_trainer_id = NULL WHERE assigned_trainer_id = $1", [id]);
        await pool.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [id]);
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
        res.redirect('/superadmin/manage');
    } catch(e) { res.render('pages/error', { message: 'Erro delete.' }); }
});

// Rota genérica de delete do manage (Redirecionando para a lógica específica se possível, ou mantendo simples)
router.post('/users/delete/:id', async (req, res) => {
    // Fallback simples
    try {
        await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
        res.redirect('back');
    } catch(e) { res.render('pages/error', { message: 'Erro delete.' }); }
});

module.exports = router;
