const express = require('express');
const router = express.Router();
const db = require('../database/db'); // Importa o objeto completo
const { pool, getUserById, getClientsByTrainer } = db; // Desestrutura o que precisamos
const bcrypt = require('bcryptjs');
const { sendNewUserEmail, sendAdminPasswordResetEmail } = require('../utils/emailService');

const requireSuperAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado. Requer permissão de Superadmin.' });
};

router.get('/dashboard', requireSuperAdmin, async (req, res) => {
    try {
        const totalUsers = await pool.query("SELECT COUNT(*) FROM users");
        const totalTrainers = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'trainer'");
        const totalClients = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'");
        
        res.render('pages/superadmin-dashboard', { 
            title: 'Painel Admin', 
            user: req.session.user,
            stats: {
                users: totalUsers.rows[0].count,
                trainers: totalTrainers.rows[0].count,
                clients: totalClients.rows[0].count
            },
            currentPage: 'superadmin-dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard.' });
    }
});

router.get('/manage', requireSuperAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
        const allUsers = result.rows;
        const trainers = allUsers.filter(u => u.role === 'trainer');
        const clients = allUsers.filter(u => u.role === 'client');

        res.render('pages/superadmin-manage', { 
            title: 'Gerenciar Usuários', 
            users: allUsers,
            trainers: trainers,
            clients: clients,
            user: req.session.user,
            csrfToken: res.locals.csrfToken,
            currentPage: 'superadmin-manage'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao listar usuários.' });
    }
});

// NOVA ROTA: Detalhes do Treinador (Superadmin)
router.get('/trainers/:id', requireSuperAdmin, async (req, res) => {
    try {
        const trainerId = req.params.id;
        
        // Usa os helpers do db.js para buscar dados
        const trainer = await getUserById(trainerId);
        
        if (!trainer) {
            return res.status(404).render('pages/error', { message: 'Treinador não encontrado.', user: req.session.user });
        }
        
        const clients = await getClientsByTrainer(trainerId);
        
        res.render('pages/trainer-details', { 
            title: 'Detalhes do Treinador',
            bodyClass: 'dashboard-body',
            currentPage: 'superadmin-manage',
            user: req.session.user,
            trainer: trainer,
            clients: clients
        });
    } catch(err) {
        console.error("Erro ao carregar detalhes do treinador:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes.', user: req.session.user });
    }
});

// Criar Treinador
router.get('/create-trainer', requireSuperAdmin, (req, res) => {
    res.render('pages/pending-trainer', { 
        title: 'Novo Treinador',
        user: req.session.user,
        csrfToken: res.locals.csrfToken,
        currentPage: 'superadmin-manage'
    });
});

router.post('/create-trainer', requireSuperAdmin, async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (name, email, password, role, status, created_at) VALUES ($1, $2, $3, 'trainer', 'active', NOW())",
            [name, email, hashedPassword]
        );
        sendNewUserEmail(req.session.user.email, name, email, 'trainer').catch(console.error);
        res.redirect('/superadmin/manage');
    } catch (err) {
        res.status(500).send('Erro ao criar treinador');
    }
});

router.post('/users/:id/status', requireSuperAdmin, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, req.params.id]);
        res.redirect('/superadmin/manage');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao atualizar status');
    }
});

router.post('/users/:id/delete', requireSuperAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
        res.redirect('/superadmin/manage');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao excluir usuário');
    }
});

router.post('/users/:id/change-password', requireSuperAdmin, async (req, res) => {
    const { new_password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(new_password, 10);
        const userRes = await pool.query("UPDATE users SET password = $1 WHERE id = $2 RETURNING email, name", [hashedPassword, req.params.id]);
        
        if (userRes.rows.length > 0) {
            const u = userRes.rows[0];
            sendAdminPasswordResetEmail(u.email, u.name, new_password).catch(console.error);
        }

        res.redirect(req.get('referer') || '/superadmin/manage');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao alterar senha.' });
    }
});

// CORRIGIDO: Atualiza diretamente na tabela USERS
router.post('/assign-trainer', requireSuperAdmin, async (req, res) => {
    const { user_id, trainer_id } = req.body;
    try {
        // Atualiza a coluna trainer_id na tabela users (Fonte da Verdade)
        await pool.query("UPDATE users SET trainer_id = $1 WHERE id = $2", [trainer_id || null, user_id]);
        res.redirect(req.get('referer'));
    } catch(err) {
        console.error(err);
        res.redirect(req.get('referer'));
    }
});

module.exports = router;

// ROTA: Detalhes do Usuário (Client) com opção de atribuir treinador
router.get('/users/:id', requireSuperAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        // 1. Busca dados básicos do usuário
        const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        const targetUser = userRes.rows[0];
        
        if (!targetUser) {
            return res.redirect('/superadmin/manage');
        }

        // 2. Se for treinador, redireciona para a página de detalhes de treinador existente
        if (targetUser.role === 'trainer') {
            return res.redirect(`/superadmin/trainers/${targetUser.id}`);
        }

        // 3. Busca perfil físico (Anamnese)
        const clientRes = await pool.query("SELECT * FROM clients WHERE user_id = $1", [userId]);
        const clientProfile = clientRes.rows[0] || {};

        // 4. Busca lista de todos os treinadores para o Dropdown
        const trainersRes = await pool.query("SELECT id, name FROM users WHERE role = 'trainer' AND status = 'active' ORDER BY name ASC");
        
        res.render('pages/superadmin-client-details', {
            title: `Detalhes: ${targetUser.name}`,
            user: req.session.user,      // Admin logado
            targetUser: targetUser,      // Usuário sendo visualizado
            clientProfile: clientProfile,
            trainers: trainersRes.rows,
            currentPage: 'superadmin-manage'
        });

    } catch (err) {
        console.error("Erro ao carregar detalhes do usuário:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes.' });
    }
});
