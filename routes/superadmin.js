const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
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

// Criar Treinador (Ação) - Assumindo que você tem uma rota POST para criar trainer ou usa o register genérico.
// Se não tiver, vou adicionar uma simples aqui caso use o formulário pending-trainer.
router.get('/create-trainer', requireSuperAdmin, (req, res) => {
    res.render('pages/pending-trainer', { 
        title: 'Novo Treinador',
        user: req.session.user,
        csrfToken: res.locals.csrfToken,
        currentPage: 'superadmin-manage'
    });
});
// Rota POST para criar trainer especificamente (caso não use /auth/register)
router.post('/create-trainer', requireSuperAdmin, async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (name, email, password, role, status, created_at) VALUES ($1, $2, $3, 'trainer', 'active', NOW())",
            [name, email, hashedPassword]
        );
        
        // NOTIFICAÇÃO: Admin recebe confirmação (o proprio admin criou, mas ok)
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

// ALTERAR SENHA PELO ADMIN
router.post('/users/:id/change-password', requireSuperAdmin, async (req, res) => {
    const { new_password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(new_password, 10);
        
        // Atualiza Senha
        const userRes = await pool.query("UPDATE users SET password = $1 WHERE id = $2 RETURNING email, name", [hashedPassword, req.params.id]);
        
        if (userRes.rows.length > 0) {
            // NOTIFICAÇÃO: Email para o usuário com a nova senha
            const u = userRes.rows[0];
            sendAdminPasswordResetEmail(u.email, u.name, new_password).catch(console.error);
        }

        res.redirect(req.get('referer') || '/superadmin/manage');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao alterar senha.' });
    }
});

// Atribuir Trainer (necessário para o client-details funcionar 100%)
router.post('/assign-trainer', requireSuperAdmin, async (req, res) => {
    const { user_id, trainer_id } = req.body;
    try {
        // Verifica se existe perfil, se não cria, se sim atualiza
        const check = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [user_id]);
        if (check.rows.length === 0) {
            await pool.query("INSERT INTO client_profiles (user_id, trainer_id) VALUES ($1, $2)", [user_id, trainer_id || null]);
        } else {
            await pool.query("UPDATE client_profiles SET trainer_id = $1 WHERE user_id = $2", [trainer_id || null, user_id]);
        }
        res.redirect(req.get('referer'));
    } catch(err) {
        console.error(err);
        res.redirect(req.get('referer'));
    }
});

module.exports = router;
