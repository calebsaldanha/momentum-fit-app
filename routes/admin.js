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
    try {
        res.render('pages/admin-dashboard', { title: 'Admin', user: req.session.user });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { title: 'Erro', message: 'Erro ao carregar dashboard' });
    }
});

router.get('/clients', isAdmin, async (req, res) => {
    try {
        const clients = await db.query("SELECT * FROM users WHERE role = 'client'");
        res.render('pages/admin-clients', { title: 'Gerenciar Alunos', user: req.session.user, clients: clients.rows });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { title: 'Erro', message: 'Erro ao carregar lista de alunos' });
    }
});

// Detalhes do Cliente para Admin (Visualização Completa)
router.get('/clients/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;
    
    // Query correta sem escapes inválidos
    const clientQuery = `
        SELECT u.name, u.email, u.profile_image, u.created_at as joined_at,
               c.*, c.id as client_real_id
        FROM users u
        LEFT JOIN clients c ON u.id = c.user_id
        WHERE u.id = $1
    `; 
    
    try {
        const clientRes = await db.query(clientQuery, [userId]);
        const clientData = clientRes.rows[0];
        
        if (!clientData) {
            return res.redirect('/admin/clients');
        }

        // Busca treinos para exibir na ficha completa
        let workouts = [];
        if (clientData.client_real_id) {
            const workoutsRes = await db.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [clientData.client_real_id]);
            workouts = workoutsRes.rows;
        }
        
        // Reutiliza a view detalhada criada para o treinador
        res.render('pages/trainer-details', { 
            title: 'Admin - Detalhes do Aluno', 
            user: req.session.user, 
            client: clientData || {},
            workouts: workouts
        });

    } catch(e) {
        console.error("Erro ao carregar detalhes do cliente:", e);
        res.redirect('/admin/clients');
    }
});

module.exports = router;
