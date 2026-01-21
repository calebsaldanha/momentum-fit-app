const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/auth/login');
}
router.use(isAuthenticated);

router.get('/', async (req, res) => {
    try {
        let usersToChat = [];
        
        // Se for Admin, lista TODOS os usuários
        if (req.session.user.role === 'admin' || req.session.user.role === 'superadmin') {
            const allUsers = await db.query("SELECT id, name, role FROM users WHERE id != $1 ORDER BY name", [req.session.user.id]);
            usersToChat = allUsers.rows;
        } else {
            // Se for User comum, lista apenas Admins e Trainers (simplificado)
            const staff = await db.query("SELECT id, name, role FROM users WHERE role IN ('admin', 'trainer') AND id != $1", [req.session.user.id]);
            usersToChat = staff.rows;
        }

        res.render('pages/chat', { 
            users: usersToChat,
            currentUser: req.session.user 
        });
    } catch(e) {
        console.error(e);
        res.render('pages/chat', { users: [], currentUser: req.session.user });
    }
});

module.exports = router;
