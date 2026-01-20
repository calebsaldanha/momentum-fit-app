const express = require('express');
const router = express.Router();
const db = require('../database/db');
const notificationService = require('../utils/notificationService');

function isClient(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}
router.use(isClient);

// Rota de Checkout (Notifica Admin)
router.post('/checkout', async (req, res) => {
    const { plan_id } = req.body;
    try {
        // ... Logica de insert subscription/payment ...
        // (Simplificada para foco na notificação)
        
        // Notificar Admin (Pagamento Pendente)
        await notificationService.notify({
            userId: 'ADMIN_GROUP',
            type: 'payment_pending_admin',
            title: 'Novo Comprovante Recebido',
            message: `O aluno ${req.session.user.name} enviou um comprovante.`,
            link: '/admin/finance',
            data: { userName: req.session.user.name, planName: 'Plano Selecionado' }
        });

        req.flash('success', 'Enviado para análise.');
        res.redirect('/client/financial');
    } catch(e) { res.redirect('/client/plans'); }
});

// Rotas básicas para não quebrar
router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: {} }));
router.get('/profile', (req, res) => res.render('pages/client-profile', { clientData: {} }));
router.get('/plans', (req, res) => res.render('pages/client-plans', { plans: [] }));
router.get('/financial', (req, res) => res.render('pages/client-financial', { subscription: null, payments: [] }));

module.exports = router;
