const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth'); // Corrigido para ensureRole

router.use(ensureAuthenticated);
router.use(ensureRole('admin')); // Corrigido chamada

router.get('/dashboard', (req, res) => {
    const stats = {
        total_users: 150,
        total_trainers: 12,
        pending_approvals: 3
    };
    
    const pendingTrainers = [
        { id: 1, name: 'Carlos Personal', email: 'carlos@fit.com', cref: '123456-G/SP', created_at: new Date() }
    ];

    res.render('pages/admin-dashboard', {
        user: req.user,
        stats,
        pendingTrainers,
        path: '/admin/dashboard'
    });
});

router.get('/users', (req, res) => {
    // Mock Users
    const users = [
        { id: 1, name: 'Admin User', email: 'admin@momentum.com', role: 'admin', status: 'active' },
        { id: 2, name: 'Trainer One', email: 'trainer@momentum.com', role: 'trainer', status: 'active' },
        { id: 3, name: 'Client One', email: 'client@momentum.com', role: 'client', status: 'active' }
    ];

    res.render('pages/admin-users', {
        user: req.user,
        users,
        path: '/admin/users'
    });
});

module.exports = router;
