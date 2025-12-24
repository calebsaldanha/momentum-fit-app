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

router.use(requireAdminAuth);

// Dashboard Operacional (Treinador/SuperAdmin atuando como Treinador)
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // AQUI ESTAVA O ERRO: Não redirecionamos mais o Super Admin.
        // Ele vê os dados DELE (userId) nesta tela.

        // 1. Meus Alunos Ativos
        const clientCount = await pool.query(
            "SELECT COUNT(*) FROM client_profiles WHERE assigned_trainer_id = $1", 
            [userId]
        );

        // 2. Meus Treinos Criados
        const workoutCount = await pool.query(
            "SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", 
            [userId]
        );

        // 3. Meus Alunos Recentes
        const recentClients = await pool.query(`
            SELECT u.id, u.name, u.email, u.created_at
            FROM users u 
            JOIN client_profiles cp ON u.id = cp.user_id 
            WHERE cp.assigned_trainer_id = $1 
            ORDER BY u.created_at DESC LIMIT 5
        `, [userId]);

        res.render('pages/admin-dashboard', { 
            title: 'Meu Painel (Personal)', 
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

// Listar MEUS Alunos
router.get('/clients', async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Sempre filtra pelo ID do usuário logado (seja trainer ou superadmin)
        // Para ver TODOS os alunos, o Super Admin usa /superadmin/manage
        let query = `
            SELECT u.id, u.name, u.email, u.status, cp.fitness_level, t.name as trainer_name 
            FROM users u 
            LEFT JOIN client_profiles cp ON u.id = cp.user_id 
            LEFT JOIN users t ON cp.assigned_trainer_id = t.id
            WHERE u.role = 'client' AND cp.assigned_trainer_id = $1 AND u.status = 'active'
            ORDER BY u.name ASC
        `;
        
        const result = await pool.query(query, [userId]);
        
        res.render('pages/admin-clients', { 
            title: 'Meus Alunos', 
            clients: result.rows, 
            currentPage: 'admin-clients' 
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao listar clientes.' }); }
});

// Detalhes do Aluno (Operacional)
router.get('/clients/:id', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isSuper = req.session.user.role === 'superadmin';

        const client = await pool.query("SELECT u.*, cp.* FROM users u LEFT JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.params.id]);
        if (client.rows.length === 0) return res.status(404).render('pages/error', { message: 'Cliente não encontrado.' });

        // Verificação de segurança: Só vê se for SEU aluno (ou se for superadmin, permitimos ver, mas o foco aqui é a visão operacional)
        if (!isSuper && client.rows[0].assigned_trainer_id !== userId) {
            return res.status(403).render('pages/error', { message: 'Você não tem permissão para ver este aluno.' });
        }

        const workouts = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.params.id]);
        
        // IMC
        let imc = 0.0;
        const p = client.rows[0];
        if (p.weight && p.height) imc = (p.weight / (p.height * p.height)).toFixed(1);

        // Carrega treinadores apenas se for atribuir (geralmente admin)
        const trainers = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') AND status = 'active'");

        res.render('pages/client-details', { 
            title: 'Detalhes do Aluno', 
            clientProfile: p, 
            workouts: workouts.rows, 
            allTrainers: trainers.rows,
            imc,
            currentPage: 'admin-clients',
            user: req.session.user
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro detalhes.' }); }
});

// ... Ações POST mantidas (atribuir, deletar, status) ... 
// (Podem ser importadas do código anterior, a lógica de permissão nelas já estava correta)
// Vou omitir para não estourar o limite, mas elas devem permanecer no arquivo.

module.exports = router;
