const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

// Middleware: Permite SuperAdmin e Treinadores Ativos
const requireAdminAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const { role, status } = req.session.user;
    
    // Superadmin tem acesso irrestrito. Treinador precisa estar ativo.
    if (role === 'superadmin' || (role === 'trainer' && status === 'active')) return next();
    
    return res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

router.use(requireAdminAuth);

// Dashboard Geral (Treinador/Admin)
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';

        let clientCountQuery, clientParams = [];
        
        // Se for SuperAdmin, vê estatísticas globais no painel geral também
        if (isSuper) {
            clientCountQuery = "SELECT COUNT(*) FROM users WHERE role = 'client'";
        } else {
            clientCountQuery = "SELECT COUNT(*) FROM client_profiles WHERE assigned_trainer_id = $1";
            clientParams = [userId];
        }

        const [clients, workouts] = await Promise.all([
            pool.query(clientCountQuery, clientParams),
            pool.query("SELECT COUNT(*) FROM workouts", []) // Simplificado para evitar erros
        ]);
        
        // Busca clientes recentes
        let recentClientsQuery;
        let recentClientsParams = [];

        if (isSuper) {
             // Admin vê os últimos cadastrados na plataforma inteira
             recentClientsQuery = `
                SELECT u.id, u.name, u.email, u.created_at 
                FROM users u 
                WHERE u.role = 'client' 
                ORDER BY u.created_at DESC LIMIT 5`;
        } else {
             // Treinador vê apenas os seus
             recentClientsQuery = `
                SELECT u.id, u.name, u.email, u.created_at 
                FROM users u 
                JOIN client_profiles cp ON u.id = cp.user_id 
                WHERE cp.assigned_trainer_id = $1 
                ORDER BY u.created_at DESC LIMIT 5`;
             recentClientsParams = [userId];
        }

        const recentClients = await pool.query(recentClientsQuery, recentClientsParams);

        res.render('pages/admin-dashboard', { 
            title: 'Painel Geral', 
            stats: { 
                totalClients: clients.rows[0].count, 
                totalWorkouts: workouts.rows[0].count, 
                weeklyCheckins: 0 // Placeholder para evitar erro
            },
            recentClients: recentClients.rows,
            currentPage: 'admin-dashboard' 
        });
    } catch (err) { 
        console.error("Erro Dashboard:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard.' }); 
    }
});

// Listagem de Clientes (Para gestão de treinos)
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
            // Treinador vê apenas seus alunos ativos
            query += " AND cp.assigned_trainer_id = $1"; 
            params.push(userId); 
        }
        // Superadmin vê todos

        query += " ORDER BY u.name ASC";

        const result = await pool.query(query, params);
        
        res.render('pages/admin-clients', { 
            title: 'Gerenciar Clientes', 
            clients: result.rows, 
            currentPage: 'admin-clients' 
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao listar clientes.' }); }
});

// Detalhes do Cliente
router.get('/clients/:id', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';

        const client = await pool.query("SELECT u.*, cp.* FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.params.id]);
        if (client.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });

        // Verificação de permissão para Treinador comum
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
    } catch (err) { console.error(err); res.status(500).render('pages/error', { message: 'Erro detalhes.' }); }
});

// Ações de Gestão (Disponíveis no contexto do Painel Geral também)
router.post('/clients/:id/assign', async (req, res) => {
    try {
        const { trainer_id } = req.body;
        const clientId = req.params.id;
        
        await pool.query("UPDATE client_profiles SET assigned_trainer_id = $1 WHERE user_id = $2", [trainer_id, clientId]);
        
        // Se atribuir, ativa o cliente automaticamente
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

module.exports = router;
