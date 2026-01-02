const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

// Middleware de Autenticação Admin
const requireAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso Negado: Apenas treinadores.' });
};

router.use(requireAdmin);

// --- DASHBOARD (VISÃO GERAL) ---
router.get('/dashboard', async (req, res) => {
    try {
        const clientsCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'");
        const workoutsCount = await pool.query("SELECT COUNT(*) FROM workouts");
        const checkinsCount = await pool.query("SELECT COUNT(*) FROM checkins WHERE date >= date_trunc('week', CURRENT_DATE)");
        
        // CORREÇÃO: Busca alunos recentes para evitar erro "recentClients is not defined"
        const recentClients = await pool.query("SELECT id, name, email FROM users WHERE role = 'client' ORDER BY created_at DESC LIMIT 5");
        
        res.render('pages/admin-dashboard', {
            title: 'Painel do Treinador',
            stats: {
                totalClients: clientsCount.rows[0].count,
                totalWorkouts: workoutsCount.rows[0].count,
                weeklyCheckins: checkinsCount.rows[0].count
            },
            recentClients: recentClients.rows, // Variável corrigida
            currentPage: 'dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard.' });
    }
});

// --- LISTA DE ALUNOS ---
router.get('/clients', async (req, res) => {
    try {
        let query = "SELECT u.id, u.name, u.email, u.status, cp.fitness_level FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.role = 'client' ORDER BY u.created_at DESC";
        const result = await pool.query(query);
        const trainers = await pool.query("SELECT id, name FROM users WHERE role = 'trainer' OR role = 'superadmin'");

        res.render('pages/admin-clients', {
            title: 'Gerenciar Alunos',
            clients: result.rows,
            trainers: trainers.rows,
            currentPage: 'clients'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao listar clientes.' });
    }
});

// --- DETALHES DO ALUNO (CORREÇÃO CRÍTICA) ---
router.get('/clients/:id', async (req, res) => {
    try {
        // Busca dados do usuário + perfil
        const clientRes = await pool.query(`
            SELECT u.id as user_id, u.name, u.email, u.status, cp.* FROM users u 
            LEFT JOIN client_profiles cp ON u.id = cp.user_id 
            WHERE u.id = $1`, [req.params.id]);
            
        if (clientRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado' });

        const clientData = clientRes.rows[0];

        // CORREÇÃO: Busca todos os treinadores para o dropdown de atribuição
        const allTrainers = await pool.query("SELECT id, name FROM users WHERE role = 'trainer' OR role = 'superadmin'");

        // CORREÇÃO: Calcula IMC para evitar "imc is not defined"
        let imc = '--';
        if (clientData.weight && clientData.height) {
            const h = parseFloat(clientData.height); // altura em metros
            const w = parseFloat(clientData.weight.toString().replace(',', '.'));
            if (h > 0) imc = (w / (h * h)).toFixed(1);
        }

        const workoutsRes = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.params.id]);
        const checkinsRes = await pool.query("SELECT * FROM checkins WHERE user_id = $1 ORDER BY date DESC LIMIT 5", [req.params.id]);

        res.render('pages/client-details', {
            title: clientData.name,
            clientProfile: clientData, // View espera 'clientProfile', não 'client'
            allTrainers: allTrainers.rows, // View espera esta lista
            imc: imc, // View espera esta variável
            workouts: workoutsRes.rows,
            checkins: checkinsRes.rows,
            currentPage: 'clients'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes do aluno.' });
    }
});

// Ações de Aluno (Atribuir, Status, Deletar)
router.post('/clients/:id/assign', async (req, res) => {
    const { trainer_id } = req.body;
    try {
        await pool.query(
            "INSERT INTO client_profiles (user_id, assigned_trainer_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET assigned_trainer_id = $2",
            [req.params.id, trainer_id]
        );
        await pool.query("UPDATE users SET status = 'active' WHERE id = $1", [req.params.id]);
        
        const trainerName = await pool.query("SELECT name FROM users WHERE id = $1", [req.session.user.id]);
        await notificationService.notifyClientAssigned(req.params.id, trainerName.rows[0]?.name || 'Treinador');

        res.redirect('/admin/clients');
    } catch (err) { console.error(err); res.redirect('/admin/clients'); }
});

router.post('/clients/:id/status', async (req, res) => {
    const { action } = req.body; // approve ou suspend
    const status = action === 'approve' ? 'active' : 'rejected';
    try {
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, req.params.id]);
        res.redirect(`/admin/clients/${req.params.id}`);
    } catch (err) { console.error(err); res.redirect('/admin/clients'); }
});

router.post('/clients/:id/delete', async (req, res) => {
    try {
        await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
        res.redirect('/admin/clients');
    } catch (err) { console.error(err); res.redirect('/admin/clients'); }
});

module.exports = router;
