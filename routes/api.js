const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

router.get('/exercises/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const result = await pool.query(
            "SELECT * FROM exercise_library WHERE name ILIKE  ORDER BY name LIMIT 10", 
            [`%${query}%`]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar exercícios' });
    }
});

module.exports = router;
