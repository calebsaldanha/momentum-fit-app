const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso Negado' });
};

router.use(requireAdmin);

router.get('/', async (req, res) => {
    try {
        // Dashboard stats
        const clientsCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'");
        const activeWorkouts = await pool.query("SELECT COUNT(*) FROM workouts");
        
        res.render('pages/admin-dashboard', {
            title: 'Painel do Treinador',
            user: req.session.user,
            stats: {
                clients: clientsCount.rows[0].count,
                workouts: activeWorkouts.rows[0].count
            },
            currentPage: 'dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro no servidor' });
    }
});

router.get('/clients', async (req, res) => {
    try {
        let query = "SELECT u.id, u.name, u.email, u.status, cp.goal, cp.assigned_trainer_id FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.role = 'client' ORDER BY u.created_at DESC";
        const result = await pool.query(query);
        
        // Buscar lista de treinadores para o dropdown de atribuição
        const trainers = await pool.query("SELECT id, name FROM users WHERE role = 'trainer' OR role = 'superadmin'");

        res.render('pages/admin-clients', {
            title: 'Gerenciar Alunos',
            clients: result.rows,
            trainers: trainers.rows,
            user: req.session.user,
            csrfToken: res.locals.csrfToken,
            currentPage: 'clients'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao listar clientes' });
    }
});

router.get('/clients/:id', async (req, res) => {
    try {
        const clientRes = await pool.query(`
            SELECT u.*, cp.* FROM users u 
            LEFT JOIN client_profiles cp ON u.id = cp.user_id 
            WHERE u.id = $1`, [req.params.id]);
            
        if (clientRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado' });

        const workoutsRes = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.params.id]);
        const checkinsRes = await pool.query("SELECT * FROM checkins WHERE user_id = $1 ORDER BY date DESC LIMIT 5", [req.params.id]);

        res.render('pages/client-details', {
            title: clientRes.rows[0].name,
            client: clientRes.rows[0],
            workouts: workoutsRes.rows,
            checkins: checkinsRes.rows,
            user: req.session.user,
            csrfToken: res.locals.csrfToken,
            currentPage: 'clients'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes' });
    }
});

router.post('/clients/:id/assign', async (req, res) => {
    const { trainer_id } = req.body;
    try {
        // Atualiza o assigned_trainer_id no perfil
        await pool.query(
            "INSERT INTO client_profiles (user_id, assigned_trainer_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET assigned_trainer_id = $2",
            [req.params.id, trainer_id]
        );
        
        // Ativa o usuário se estiver pendente
        await pool.query("UPDATE users SET status = 'active' WHERE id = $1", [req.params.id]);
        
        // Notificação
        const trainerName = await pool.query("SELECT name FROM users WHERE id = $1", [req.session.user.id]);
        await notificationService.notifyClientAssigned(req.params.id, trainerName.rows[0]?.name || 'Treinador');

        res.redirect('/admin/clients');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao atribuir treinador' });
    }
});

router.post('/clients/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, req.params.id]);
        res.redirect(`/admin/clients/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao alterar status' });
    }
});

module.exports = router;
