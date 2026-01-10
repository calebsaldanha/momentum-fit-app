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
router.get('/dashboard', isAuthenticated, (req, res) => {
    // Busca dados do usuário e do cliente
    db.get(`SELECT u.name, u.email, u.profile_image, c.* FROM users u 
            LEFT JOIN clients c ON u.id = c.user_id 
            WHERE u.id = ?`, [req.session.user.id], (err, client) => {
        
        if (err) {
            console.error(err);
            return res.render('pages/error', { message: "Erro ao carregar dashboard" });
        }

        // Busca próximos treinos
        db.all(`SELECT * FROM workouts WHERE client_id = ? AND status = 'pending' ORDER BY date ASC LIMIT 3`, 
            [client.id], (err, workouts) => {
            
            res.render('pages/client-dashboard', { 
                user: req.session.user,
                client: client,
                workouts: workouts || []
            });
        });
    });
});

// Visualizar Perfil
router.get('/profile', isAuthenticated, (req, res) => {
    db.get(`SELECT u.name, u.email, u.profile_image, c.* FROM users u 
            LEFT JOIN clients c ON u.id = c.user_id 
            WHERE u.id = ?`, [req.session.user.id], (err, client) => {
        if (err) console.error(err);
        
        res.render('pages/client-profile', { 
            user: req.session.user,
            client: client || {} // Garante que não quebre se client for null
        });
    });
});

// ATUALIZAR Perfil (A Correção Principal)
router.post('/profile', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const { 
        name, phone, birth_date, gender,
        height, current_weight, fitness_goals,
        injuries, medications, lifestyle, availability 
    } = req.body;

    // 1. Atualiza tabela USERS (Nome base)
    db.run(`UPDATE users SET name = ? WHERE id = ?`, [name, userId], (err) => {
        if (err) console.error("Erro ao atualizar user:", err);
    });

    // 2. Atualiza ou Cria tabela CLIENTS (Dados completos)
    // Primeiro verificamos se já existe o registro em clients
    db.get(`SELECT id FROM clients WHERE user_id = ?`, [userId], (err, row) => {
        if (err) {
            console.error(err);
            return res.redirect('/client/profile?error=db_error');
        }

        if (row) {
            // UPDATE
            const sql = `UPDATE clients SET 
                phone = ?, birth_date = ?, gender = ?,
                height = ?, current_weight = ?, fitness_goals = ?,
                injuries = ?, medications = ?, lifestyle = ?, availability = ?
                WHERE user_id = ?`;
            
            const params = [
                phone, birth_date, gender,
                height, current_weight, fitness_goals,
                injuries, medications, lifestyle, availability,
                userId
            ];

            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Erro no Update Clients:", err);
                    return res.redirect('/client/profile?error=update_failed');
                }
                // Atualiza sessão se o nome mudou
                req.session.user.name = name;
                res.redirect('/client/profile?success=true');
            });
        } else {
            // INSERT (Caso raro onde o user existe mas não tem client vinculado)
            const sql = `INSERT INTO clients (
                user_id, phone, birth_date, gender,
                height, current_weight, fitness_goals,
                injuries, medications, lifestyle, availability
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const params = [
                userId, phone, birth_date, gender,
                height, current_weight, fitness_goals,
                injuries, medications, lifestyle, availability
            ];

            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Erro no Insert Clients:", err);
                    return res.redirect('/client/profile?error=insert_failed');
                }
                res.redirect('/client/profile?success=created');
            });
        }
    });
});

// Meus Treinos
router.get('/workouts', isAuthenticated, (req, res) => {
    db.get("SELECT id FROM clients WHERE user_id = ?", [req.session.user.id], (err, client) => {
        if (!client) return res.redirect('/client/dashboard');

        db.all(`SELECT * FROM workouts WHERE client_id = ? ORDER BY date DESC`, [client.id], (err, workouts) => {
            res.render('pages/client-workouts', { 
                user: req.session.user,
                workouts: workouts 
            });
        });
    });
});

module.exports = router;
