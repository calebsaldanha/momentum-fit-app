const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

router.use(ensureAuthenticated);
router.use(ensureRole('admin'));

router.get('/dashboard', (req, res) => {
    const stats = { total_users: 150, total_trainers: 12, pending_approvals: 3 };
    const pendingTrainers = [
        { id: 1, name: 'Carlos Personal', email: 'carlos@fit.com', cref: '123456-G/SP', created_at: new Date() }
    ];
    res.render('pages/admin-dashboard', { user: req.user, stats, pendingTrainers, path: '/admin/dashboard' });
});

router.get('/users', (req, res) => {
    const users = [
        { id: 1, name: 'Admin User', email: 'admin@momentum.com', role: 'admin', status: 'active' },
        { id: 2, name: 'Trainer One', email: 'trainer@momentum.com', role: 'trainer', status: 'active' },
        { id: 3, name: 'Client One', email: 'client@momentum.com', role: 'client', status: 'active' }
    ];
    res.render('pages/admin-users', { user: req.user, users, path: '/admin/users' });
});

// --- APPROVALS ---
router.get('/approvals', (req, res) => {
    const pending = [
        { id: 1, name: 'Carlos Personal', email: 'carlos@fit.com', cref: '123456-G/SP', documents: ['Diploma.pdf'] }
    ];
    res.render('pages/admin-approvals', { user: req.user, pending, path: '/admin/approvals' });
});

router.get('/approvals/:id', (req, res) => {
    // Simulação de detalhe
    const trainer = { id: req.params.id, name: 'Carlos Personal', email: 'carlos@fit.com', cref: '123456-G/SP', bio: 'Especialista em LPO.' };
    res.render('pages/pending-trainer', { user: req.user, trainer, path: '/admin/approvals' });
});

// --- FINANCE ---
router.get('/finance', (req, res) => {
    const financeStats = { revenue: 15000, platform_fee: 1500, trainer_payouts: 13500 };
    res.render('pages/admin-finance', { user: req.user, stats: financeStats, path: '/admin/finance' });
});

// --- SETTINGS ---
router.get('/settings', (req, res) => {
    const settings = { allow_registrations: true, maintenance_mode: false, ai_model: 'GPT-4' };
    res.render('pages/admin-settings', { user: req.user, settings, path: '/admin/settings' });
});

module.exports = router;
