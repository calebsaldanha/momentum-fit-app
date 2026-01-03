const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const bcrypt = require('bcryptjs');

// Middleware de autenticação para Superadmin
const requireSuperAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado. Requer permissão de Superadmin.' });
};

// Dashboard Principal
router.get('/dashboard', requireSuperAdmin, async (req, res) => {
    try {
        // Estatísticas Gerais
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

// Gerenciar Usuários (Listagem)
router.get('/manage', requireSuperAdmin, async (req, res) => {
    try {
        // Busca todos os usuários
        const result = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
        const allUsers = result.rows;

        // CORREÇÃO: Separar Treinadores e Clientes para a View
        const trainers = allUsers.filter(u => u.role === 'trainer');
        const clients = allUsers.filter(u => u.role === 'client');

        res.render('pages/superadmin-manage', { 
            title: 'Gerenciar Usuários', 
            users: allUsers, // Mantemos o geral por segurança
            trainers: trainers, // <--- A variável que faltava
            clients: clients,   // <--- Provavelmente usada também
            user: req.session.user,
            csrfToken: res.locals.csrfToken,
            currentPage: 'superadmin-manage'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao listar usuários.' });
    }
});

// Criar Treinador (Página)
router.get('/create-trainer', requireSuperAdmin, (req, res) => {
    res.render('pages/pending-trainer', { 
        title: 'Novo Treinador',
        user: req.session.user,
        csrfToken: res.locals.csrfToken,
        currentPage: 'superadmin-manage'
    });
});

// --- ROTAS DE AÇÃO ---

// Alterar Status (Ativar/Inativar)
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

// Excluir Usuário
router.post('/users/:id/delete', requireSuperAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
        res.redirect('/superadmin/manage');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao excluir usuário');
    }
});

// Alterar Senha de Usuário (Admin)
router.post('/users/:id/change-password', requireSuperAdmin, async (req, res) => {
    const { new_password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, req.params.id]);
        res.redirect(req.get('referer') || '/superadmin/manage');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao alterar senha.' });
    }
});

module.exports = router;
