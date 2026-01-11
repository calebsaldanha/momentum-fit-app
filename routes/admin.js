const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
}

router.get('/dashboard', isAdmin, async (req, res) => {
    // Dashboard logic...
    res.render('pages/admin-dashboard', { title: 'Admin', user: req.session.user });
});

router.get('/clients', isAdmin, async (req, res) => {
    const clients = await db.query("SELECT * FROM users WHERE role = 'client'");
    res.render('pages/admin-clients', { title: 'Gerenciar Alunos', user: req.session.user, clients: clients.rows });
});

// Detalhes do Cliente para Admin (Reutiliza a view do Trainer ou cria uma similar)
router.get('/clients/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;
    const clientQuery = \`
        SELECT u.name, u.email, u.profile_image, u.created_at as joined_at,
               c.*, c.id as client_real_id
        FROM users u
        LEFT JOIN clients c ON u.id = c.user_id
        WHERE u.id = \$1
    \`; // Using backslash escape here for bash consistency if needed, but standard quote is fine inside cat
    
    try {
        const clientRes = await db.query(clientQuery, [userId]);
        const clientData = clientRes.rows[0];
        
        // Admin pode usar a mesma view detalhada do treinador, pois contém tudo
        res.render('pages/trainer-details', { 
            title: 'Admin - Detalhes do Aluno', 
            user: req.session.user, 
            client: clientData || {},
            workouts: [] 
        });
    } catch(e) {
        res.redirect('/admin/clients');
    }
});

module.exports = router;
