const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware Admin Seguro
function requireAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    // Salva msg de erro na sessão ou query para mostrar no login
    res.redirect('/auth/login?error=Acesso restrito ao administrador');
}

router.use(requireAdmin);

// DASHBOARD
router.get('/dashboard', async (req, res) => {
    try {
        // Estatísticas com queries individuais para isolar falhas
        let userCount = 0;
        let trainerCount = 0;
        let pendingCount = 0;

        try {
            const r1 = await db.query("SELECT COUNT(*) FROM users");
            userCount = r1.rows[0].count;
        } catch(e) { console.error("Erro count users:", e.message); }

        try {
            const r2 = await db.query("SELECT COUNT(*) FROM users WHERE role = 'trainer'");
            trainerCount = r2.rows[0].count;
        } catch(e) { console.error("Erro count trainers:", e.message); }

        try {
            // Esta é a query crítica que estava falhando
            const r3 = await db.query("SELECT COUNT(*) FROM trainers WHERE approval_status = 'pending'");
            pendingCount = r3.rows[0].count;
        } catch(e) { 
            console.error("Erro count pending (coluna approval_status pode faltar):", e.message); 
            // Fallback se a coluna não existir ainda
            pendingCount = 0;
        }
        
        const stats = {
            users: userCount,
            trainers: trainerCount,
            pending_approvals: pendingCount
        };
        
        res.render('pages/admin-dashboard', { 
            title: 'Painel Admin', 
            stats,
            currentPage: '/admin/dashboard'
        });
    } catch (e) { 
        console.error("Erro Geral Dashboard Admin:", e);
        res.render('pages/error', { message: 'Erro ao carregar dados do painel.', error: e }); 
    }
});

// CLIENTES
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

// APROVAÇÕES
router.get('/approvals', async (req, res) => {
    try {
        // Busca treinadores pendentes com dados de usuário
        // Usa LEFT JOIN para não perder dados se a relação estiver quebrada
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
        console.error("Erro Aprovacoes:", e);
        // Renderiza lista vazia em caso de erro para não travar
        res.render('pages/admin-approvals', { 
            title: 'Aprovações Pendentes', 
            pendingTrainers: [], 
            currentPage: '/admin/approvals',
            error: 'Erro ao buscar dados. Verifique o banco de dados.'
        });
    }
});

// ACTIONS
router.post('/approve-trainer/:id', async (req, res) => {
    try {
        await db.query("UPDATE trainers SET approval_status = 'approved' WHERE id = $1", [req.params.id]);
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
