const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

// Middleware de segurança para rotas de admin/treinador
const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso negado. Apenas treinadores podem gerenciar treinos.' });
};

// --- CRIAÇÃO ---

// GET: Formulário de Novo Treino
router.get('/create', requireTrainerAuth, async (req, res) => {
    try {
        const clients = await pool.query("SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name");
        res.render('pages/create-workout', { 
            title: 'Novo Treino', 
            clients: clients.rows, 
            selectedClientId: req.query.clientId || '', 
            currentPage: 'create-workout' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar formulário.' });
    }
});

// POST: Salvar Novo Treino
router.post('/create', requireTrainerAuth, async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    const trainer_id = req.session.user.id;

    try {
        // Validação básica
        if (!client_id || !title || !exercises || exercises.length === 0) {
            return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
        }

        const query = `
            INSERT INTO workouts (client_id, trainer_id, title, description, exercises, created_at) 
            VALUES ($1, $2, $3, $4, $5, NOW()) 
            RETURNING id
        `;
        await pool.query(query, [client_id, trainer_id, title, description || '', JSON.stringify(exercises)]);
        
        res.json({ success: true, clientId: client_id });
    } catch (err) {
        console.error("Erro ao criar treino:", err);
        res.status(500).json({ success: false, message: 'Erro no servidor ao salvar treino.' });
    }
});

// --- EDIÇÃO ---

// GET: Formulário de Edição
router.get('/edit/:id', requireTrainerAuth, async (req, res) => {
    try {
        const query = `
            SELECT w.*, u.name as client_name 
            FROM workouts w 
            JOIN users u ON w.client_id = u.id 
            WHERE w.id = $1
        `;
        const result = await pool.query(query, [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        }

        res.render('pages/edit-workout', { 
            title: 'Editar Treino', 
            workout: result.rows[0], 
            currentPage: 'admin-clients' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar treino para edição.' });
    }
});

// POST: Atualizar Treino
router.post('/edit/:id', requireTrainerAuth, async (req, res) => {
    const { title, description, exercises } = req.body;
    
    try {
        const query = `
            UPDATE workouts 
            SET title = $1, description = $2, exercises = $3, updated_at = NOW() 
            WHERE id = $4 
            RETURNING client_id
        `;
        const result = await pool.query(query, [title, description, JSON.stringify(exercises), req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Treino não encontrado.' });
        }

        res.json({ success: true, clientId: result.rows[0].client_id });
    } catch (err) {
        console.error("Erro ao atualizar treino:", err);
        res.status(500).json({ success: false, message: 'Erro ao atualizar treino.' });
    }
});

// --- LEITURA / DETALHES ---

router.get('/:id', async (req, res) => {
    try {
        const query = `
            SELECT w.*, t.name as trainer_name 
            FROM workouts w 
            LEFT JOIN users t ON w.trainer_id = t.id 
            WHERE w.id = $1
        `;
        const result = await pool.query(query, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        }

        res.render('pages/workout-details', { 
            title: result.rows[0].title, 
            workout: result.rows[0], 
            user: req.session.user, // Passar usuário para verificar permissões na view
            currentPage: req.session.user.role === 'client' ? 'client-workouts' : 'admin-clients' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes.' });
    }
});

module.exports = router;
