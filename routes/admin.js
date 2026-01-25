const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const db = require('../database/db');

router.use(ensureAuthenticated);
router.use(ensureRole('admin'));

// ... (Rotas existentes: dashboard, users, approvals, finance mantidas) ...
// Estou reescrevendo as principais para garantir contexto, adicione as outras se precisar

router.get('/dashboard', async (req, res) => {
    // ... (Lógica existente de stats)
    res.render('pages/admin-dashboard', { user: req.user, stats: {}, pendingTrainers: [], path: '/admin/dashboard' });
});

// --- ROTA NOVA: GERENCIADOR DE CONTEÚDO ---
router.get('/content/edit', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM site_content ORDER BY page, section, id');
        // Agrupa para a view
        const content = {};
        result.rows.forEach(r => {
            if (!content[r.page]) content[r.page] = [];
            content[r.page].push(r);
        });

        res.render('pages/admin-cms-editor', { 
            user: req.user, 
            content, 
            path: '/admin/settings' // Fica sob configurações ou conteúdo
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { user: req.user, message: 'Erro ao carregar editor', path: '' });
    }
});

router.post('/content/update', async (req, res) => {
    try {
        const updates = req.body; // Espera { 'id_1': 'Novo valor', 'id_2': 'Outro valor' }
        
        // Itera sobre as chaves do body
        for (const [key, value] of Object.entries(updates)) {
            if (key.startsWith('content_')) {
                const id = key.replace('content_', '');
                await db.query('UPDATE site_content SET value = $1 WHERE id = $2', [value, id]);
            }
        }
        
        req.flash('success_msg', 'Conteúdo do site atualizado com sucesso!');
        res.redirect('/admin/content/edit');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Erro ao salvar conteúdo.');
        res.redirect('/admin/content/edit');
    }
});

// Rotas placeholder para não quebrar links
router.get('/users', (req, res) => res.render('pages/admin-users', { user: req.user, users: [], path: '/admin/users' }));
router.get('/approvals', (req, res) => res.render('pages/admin-approvals', { user: req.user, pending: [], path: '/admin/approvals' }));
router.get('/finance', (req, res) => res.render('pages/admin-finance', { user: req.user, stats: {revenue:0}, path: '/admin/finance' }));
router.get('/settings', (req, res) => res.render('pages/admin-settings', { user: req.user, path: '/admin/settings' }));

module.exports = router;
