const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

router.get('/create', async (req, res) => {
    const clients = await pool.query("SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name");
    res.render('pages/create-workout', { 
        title: 'Novo Treino', 
        clients: clients.rows, 
        selectedClientId: req.query.clientId, 
        currentPage: 'create-workout' 
    });
});

router.get('/:id', async (req, res) => {
    const result = await pool.query("SELECT w.*, u.name as trainer_name FROM workouts w JOIN users u ON w.trainer_id = u.id WHERE w.id = $1", [req.params.id]);
    res.render('pages/workout-details', { 
        title: result.rows[0].title, 
        workout: result.rows[0], 
        currentPage: req.session.user.role === 'client' ? 'client-workouts' : 'admin-clients' 
    });
});
module.exports = router;
