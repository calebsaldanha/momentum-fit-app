const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware de autenticação
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
}

// Dashboard do Cliente
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        // Busca dados do usuário e do cliente
        // Usamos alias "client_real_id" para evitar conflito de IDs no JOIN
        const clientQuery = `
            SELECT u.name, u.email, u.profile_image, c.id as client_real_id, c.* FROM users u 
            LEFT JOIN clients c ON u.id = c.user_id 
            WHERE u.id = $1
        `;
        
        const clientRes = await db.query(clientQuery, [req.session.user.id]);
        const client = clientRes.rows[0];

        let workouts = [];
        
        // Se o cliente existe e tem ID vinculado
        if (client && client.client_real_id) {
            const workoutsQuery = `
                SELECT * FROM workouts 
                WHERE client_id = $1 AND status = 'pending' 
                ORDER BY date ASC LIMIT 3
            `;
            const workoutsRes = await db.query(workoutsQuery, [client.client_real_id]);
            workouts = workoutsRes.rows;
        }

        res.render('pages/client-dashboard', { 
            user: req.session.user,
            client: client || {},
            workouts: workouts || []
        });

    } catch (err) {
        console.error("Erro dashboard:", err);
        return res.render('pages/error', { message: "Erro ao carregar dashboard" });
    }
});

// Visualizar Perfil
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const query = `
            SELECT u.name, u.email, u.profile_image, c.* FROM users u 
            LEFT JOIN clients c ON u.id = c.user_id 
            WHERE u.id = $1
        `;
        const { rows } = await db.query(query, [req.session.user.id]);
        
        res.render('pages/client-profile', { 
            user: req.session.user,
            client: rows[0] || {} 
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: "Erro ao carregar perfil" });
    }
});

// ATUALIZAR Perfil
router.post('/profile', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const { 
        name, phone, birth_date, gender,
        height, current_weight, fitness_goals,
        injuries, medications, lifestyle, availability 
    } = req.body;

    try {
        // 1. Atualiza tabela USERS (Nome base)
        await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);

        // 2. Verifica se já existe o registro em clients
        const checkRes = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
        const exists = checkRes.rows.length > 0;

        if (exists) {
            // UPDATE
            const sql = `UPDATE clients SET 
                phone = $1, birth_date = $2, gender = $3,
                height = $4, current_weight = $5, fitness_goals = $6,
                injuries = $7, medications = $8, lifestyle = $9, availability = $10
                WHERE user_id = $11`;
            
            const params = [
                phone, birth_date, gender,
                height, current_weight, fitness_goals,
                injuries, medications, lifestyle, availability,
                userId
            ];

            await db.query(sql, params);
        } else {
            // INSERT
            const sql = `INSERT INTO clients (
                user_id, phone, birth_date, gender,
                height, current_weight, fitness_goals,
                injuries, medications, lifestyle, availability
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

            const params = [
                userId, phone, birth_date, gender,
                height, current_weight, fitness_goals,
                injuries, medications, lifestyle, availability
            ];

            await db.query(sql, params);
        }

        // Atualiza sessão se o nome mudou
        req.session.user.name = name;
        res.redirect('/client/profile?success=true');

    } catch (err) {
        console.error("Erro ao atualizar perfil:", err);
        res.redirect('/client/profile?error=update_failed');
    }
});

// Meus Treinos
router.get('/workouts', isAuthenticated, async (req, res) => {
    try {
        const clientRes = await db.query("SELECT id FROM clients WHERE user_id = $1", [req.session.user.id]);
        const client = clientRes.rows[0];

        if (!client) return res.redirect('/client/dashboard');

        // Busca treinos do cliente
        const workoutsRes = await db.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY date DESC", [client.id]);
        
        res.render('pages/client-workouts', { 
            user: req.session.user,
            workouts: workoutsRes.rows 
        });
    } catch (err) {
        console.error(err);
        res.redirect('/client/dashboard');
    }
});

module.exports = router;
