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
        res.render('pages/superadmin-dashboard', { title: 'Gestão Global', stats, currentPage: 'superadmin-dashboard' });
    } catch (err) { res.render('pages/error', { message: 'Erro dash.' }); }
});

router.get('/manage', async (req, res) => {
    try {
        const trainers = await pool.query("SELECT * FROM users WHERE role = 'trainer' ORDER BY created_at DESC");
        const clients = await pool.query("SELECT * FROM users WHERE role = 'client' ORDER BY created_at DESC");
        res.render('pages/superadmin-manage', { title: 'Gerenciar Usuários', trainers: trainers.rows, clients: clients.rows, currentPage: 'superadmin-manage' });
    } catch (err) { res.render('pages/error', { message: 'Erro manage.' }); }
});

// Detalhes do Treinador (ROTA QUE FALTAVA OU ESTAVA INCOMPLETA)
router.get('/trainers/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users WHERE id = $1 AND role = 'trainer'", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treinador não encontrado' });
        
        // Alunos vinculados
        const clientsRes = await pool.query("SELECT u.name, u.email FROM users u JOIN client_profiles cp ON u.id=cp.user_id WHERE cp.assigned_trainer_id=$1", [req.params.id]);

        res.render('pages/trainer-details', { 
            title: 'Detalhes Treinador', 
            trainer: result.rows[0], 
            clients: clientsRes.rows, 
            currentPage: 'superadmin-manage' 
        });
    } catch (err) { res.render('pages/error', { message: 'Erro detalhes.' }); }
});

// Ações Genéricas (Status e Delete)
router.post('/users/:id/status', async (req, res) => {
    try {
        const { action, role } = req.body;
        const newStatus = action === 'approve' ? 'active' : 'rejected';
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [newStatus, req.params.id]);
        
        if (action === 'approve' && role === 'trainer') {
            await notificationService.notifyTrainerApproval(req.params.id);
        }
        
        // Redireciona de volta para onde estava
        const referer = req.get('Referer');
        if (referer && referer.includes('/trainers/')) res.redirect(referer);
        else res.redirect('/superadmin/manage');
    } catch(e) { res.render('pages/error', { message: 'Erro status.' }); }
});

router.post('/users/:id/delete', async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [id]);
        await pool.query("UPDATE client_profiles SET assigned_trainer_id = NULL WHERE assigned_trainer_id = $1", [id]);
        await pool.query("DELETE FROM workouts WHERE trainer_id = $1", [id]);
        await pool.query("DELETE FROM client_profiles WHERE user_id = $1", [id]); // Caso seja cliente
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
        res.redirect('/superadmin/manage');
    } catch(e) { res.render('pages/error', { message: 'Erro delete.' }); }
});

module.exports = router;

// --- Rotas de Ação de Usuário (Injetadas para suporte a detalhes) ---
router.post('/assign-trainer', async (req, res) => {
    if(req.session.user.role !== 'superadmin') return res.status(403).send('Acesso negado');
    const { user_id, trainer_id } = req.body;
    try {
        const tid = trainer_id === '' ? null : trainer_id;
        await pool.query("UPDATE users SET trainer_id = $1 WHERE id = $2", [tid, user_id]);
        req.flash('success_msg', 'Personal atualizado com sucesso.');
        res.redirect('/admin/clients/' + user_id);
    } catch(err) {
        console.error(err);
        res.redirect('/admin/clients/' + user_id);
    }
});

router.post('/toggle-status', async (req, res) => {
    if(req.session.user.role !== 'superadmin') return res.status(403).send('Acesso negado');
    const { user_id, status } = req.body;
    try {
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, user_id]);
        req.flash('success_msg', 'Status atualizado.');
        res.redirect('/admin/clients/' + user_id);
    } catch(err) {
        console.error(err);
        res.redirect('/admin/clients/' + user_id);
    }
});

router.post('/delete-user', async (req, res) => {
    if(req.session.user.role !== 'superadmin') return res.status(403).send('Acesso negado');
    const { user_id } = req.body;
    try {
        // Excluir dados relacionados (Cascade geralmente resolve, mas garantindo)
        await pool.query("DELETE FROM users WHERE id = $1", [user_id]);
        req.flash('success_msg', 'Usuário excluído.');
        res.redirect('/superadmin/manage');
    } catch(err) {
        console.error(err);
        req.flash('error_msg', 'Erro ao excluir usuário.');
        res.redirect('/admin/clients/' + user_id);
    }
});
