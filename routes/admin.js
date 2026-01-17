const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware Admin Seguro
function isAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    // Salva msg de erro na sessão ou query para mostrar no login
    res.redirect('/auth/login?error=Acesso restrito ao administrador');
}

router.use(isAdmin);

router.get('/dashboard', async (req, res) => {
    try {
        // Estatísticas gerais com fallback para 0 se der erro
        const usersRes = await db.query("SELECT COUNT(*) FROM users");
        const trainersRes = await db.query("SELECT COUNT(*) FROM users WHERE role = 'trainer'");
        const pendingRes = await db.query("SELECT COUNT(*) FROM trainers WHERE approval_status = 'pending'");
        
        const stats = {
            users: usersRes.rows[0]?.count || 0,
            trainers: trainersRes.rows[0]?.count || 0,
            pending_approvals: pendingRes.rows[0]?.count || 0
        };
        
        res.render('pages/admin-dashboard', { 
            title: 'Painel Admin', 
            stats,
            currentPage: '/admin/dashboard'
        });
    } catch (e) { 
        console.error("Erro Dashboard Admin:", e);
        res.render('pages/error', { message: 'Erro ao carregar dados do painel.' }); 
    }
});

router.get('/clients', async (req, res) => {
    try {
        const users = await db.query("SELECT * FROM users WHERE role = 'client' ORDER BY created_at DESC LIMIT 100");
        res.render('pages/admin-clients', { 
            title: 'Gerenciar Usuários', 
            users: users.rows,
            currentPage: '/admin/clients'
        });
    } catch (e) { 
        console.error(e); 
        res.render('pages/error', { message: 'Erro ao listar clientes.' }); 
    }
});

router.get('/approvals', async (req, res) => {
    try {
        // Busca treinadores pendentes com dados de usuário
        const query = `
            SELECT t.*, u.name, u.email, u.profile_image 
            FROM trainers t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.approval_status = 'pending'
        `;
        const result = await db.query(query);
        
        res.render('pages/admin-approvals', { 
            title: 'Aprovações Pendentes', 
            pendingTrainers: result.rows, 
            currentPage: '/admin/approvals' 
        });
    } catch (e) {
        console.error(e);
        res.render('pages/error', { message: 'Erro ao carregar aprovações.' });
    }
});

// Ações de Aprovação
router.post('/approve-trainer/:id', async (req, res) => {
    try {
        await db.query("UPDATE trainers SET approval_status = 'approved' WHERE id = $1", [req.params.id]);
        // Aqui poderia enviar e-mail de boas vindas
        res.redirect('/admin/approvals?success=Treinador aprovado');
    } catch (e) {
        console.error(e);
        res.redirect('/admin/approvals?error=Erro ao aprovar');
    }
});

router.post('/reject-trainer/:id', async (req, res) => {
    try {
        await db.query("UPDATE trainers SET approval_status = 'rejected' WHERE id = $1", [req.params.id]);
        res.redirect('/admin/approvals?success=Treinador rejeitado');
    } catch (e) {
        console.error(e);
        res.redirect('/admin/approvals?error=Erro ao rejeitar');
    }
});

// Rotas de Visualização (Stubs funcionais)
router.get('/content', (req, res) => res.render('pages/admin-content', { title: 'Gestão de Conteúdo', currentPage: '/admin/content' }));
router.get('/plans', (req, res) => res.render('pages/admin-plans', { title: 'Gestão de Planos', currentPage: '/admin/plans' }));
router.get('/finance', (req, res) => res.render('pages/admin-finance', { title: 'Financeiro', currentPage: '/admin/finance' }));
router.get('/ia-audit', (req, res) => res.render('pages/admin-ia-audit', { title: 'Auditoria IA', currentPage: '/admin/ia-audit' }));
router.get('/settings', (req, res) => res.render('pages/admin-settings', { title: 'Configurações', currentPage: '/admin/settings' }));

module.exports = router;
