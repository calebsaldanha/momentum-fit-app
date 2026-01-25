const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const pool = require('../database/db');

// Middleware local para garantir que Ã© trainer
const isTrainer = [ensureAuthenticated, ensureRole('trainer')];

// í³Š DASHBOARD PRINCIPAL
router.get('/dashboard', isTrainer, async (req, res) => {
    try {
        // Buscar KPIs do Trainer
        const trainerId = req.user.id;
        
        const kpiQuery = `
            SELECT 
                (SELECT COUNT(*) FROM assignments WHERE trainer_id = $1 AND status = 'active') as active_clients,
                (SELECT COUNT(*) FROM workouts WHERE creator_id = $1) as total_workouts,
                (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false) as unread_notifs
        `;
        
        const kpiResult = await pool.query(kpiQuery, [trainerId]);
        const stats = kpiResult.rows[0];

        // Buscar Alunos Recentes (Limit 5)
        const clientsQuery = `
            SELECT u.id, u.name, u.photo_url, u.last_login, p.name as plan_name,
                   CASE WHEN u.plan_expires_at > NOW() THEN 'active' ELSE 'expired' END as plan_status
            FROM assignments a
            JOIN users u ON a.client_id = u.id
            LEFT JOIN plans p ON u.current_plan_id = p.id
            WHERE a.trainer_id = $1 AND a.status = 'active'
            ORDER BY u.last_login DESC NULLS LAST
            LIMIT 5
        `;
        
        const clientsResult = await pool.query(clientsQuery, [trainerId]);

        res.render('pages/trainer-dashboard', {
            user: req.user,
            stats,
            recentClients: clientsResult.rows,
            path: '/trainer/dashboard'
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro ao carregar dashboard', error: err });
    }
});

// í±¥ LISTA DE CLIENTES (Gerenciamento)
router.get('/clients', isTrainer, async (req, res) => {
    try {
        const trainerId = req.user.id;
        
        // Busca completa com status do plano
        const query = `
            SELECT u.id, u.name, u.email, u.phone, u.photo_url, u.objective, 
                   p.name as plan_name,
                   u.plan_expires_at,
                   a.status as assignment_status
            FROM assignments a
            JOIN users u ON a.client_id = u.id
            LEFT JOIN plans p ON u.current_plan_id = p.id
            WHERE a.trainer_id = $1
            ORDER BY u.name ASC
        `;
        
        const result = await pool.query(query, [trainerId]);

        res.render('pages/trainer-clients', {
            user: req.user,
            clients: result.rows,
            path: '/trainer/clients'
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro ao listar alunos.');
        res.redirect('/trainer/dashboard');
    }
});

// âž• ADICIONAR CLIENTE (VÃ­nculo por E-mail)
// O cliente jÃ¡ deve existir na plataforma. Futuramente: Invite System.
router.post('/clients/add', isTrainer, async (req, res) => {
    const { email } = req.body;
    const trainerId = req.user.id;

    try {
        // 1. Verificar se usuÃ¡rio existe e Ã© client
        const userCheck = await pool.query('SELECT id, role FROM users WHERE email = $1', [email]);
        
        if (userCheck.rows.length === 0) {
            req.flash('error', 'UsuÃ¡rio nÃ£o encontrado com este e-mail.');
            return res.redirect('/trainer/clients');
        }

        const client = userCheck.rows[0];
        
        if (client.role !== 'client') {
            req.flash('error', 'Este e-mail pertence a um treinador ou admin, nÃ£o a um aluno.');
            return res.redirect('/trainer/clients');
        }

        // 2. Criar vÃ­nculo
        await pool.query(`
            INSERT INTO assignments (trainer_id, client_id, status)
            VALUES ($1, $2, 'active')
            ON CONFLICT (trainer_id, client_id) DO UPDATE SET status = 'active'
        `, [trainerId, client.id]);

        req.flash('success', 'Aluno vinculado com sucesso!');
        res.redirect('/trainer/clients');

    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro ao adicionar aluno.');
        res.redirect('/trainer/clients');
    }
});

// í·‘ï¸ REMOVER CLIENTE (Arquivar vÃ­nculo)
router.post('/clients/remove', isTrainer, async (req, res) => {
    const { clientId } = req.body;
    const trainerId = req.user.id;

    try {
        await pool.query('UPDATE assignments SET status = \'archived\' WHERE trainer_id = $1 AND client_id = $2', [trainerId, clientId]);
        req.flash('success', 'VÃ­nculo com aluno removido.');
        res.redirect('/trainer/clients');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro ao remover aluno.');
        res.redirect('/trainer/clients');
    }
});

module.exports = router;
