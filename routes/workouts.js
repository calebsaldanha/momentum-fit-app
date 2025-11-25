const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { body, validationResult } = require('express-validator');

// Middleware de autenticação (Treinador ou Superadmin)
const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
};

router.use(requireTrainerAuth);

// Página de Criação de Treino
router.get('/create', async (req, res) => {
    try {
        const { role, id } = req.session.user;
        let clientsQuery;
        let params = [];

        // Se for Super Admin, vê todos os clientes para criar treino
        if (role === 'superadmin') {
            clientsQuery = "SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name";
        } else {
            // Se for Trainer, vê apenas seus clientes atribuídos
            // OU clientes sem personal atribuído? Por segurança, vamos limitar aos atribuídos
            clientsQuery = `
                SELECT u.id, u.name, u.email 
                FROM users u
                JOIN client_profiles cp ON u.id = cp.user_id
                WHERE u.role = 'client' AND cp.assigned_trainer_id = $1
                ORDER BY u.name
            `;
            params = [id];
        }

        const clientsRes = await pool.query(clientsQuery, params);
        
        // Pega o clientId da URL se vier (ao clicar em "Criar Treino" na página de detalhes)
        const selectedClientId = req.query.clientId || '';

        res.render('pages/create-workout', {
            title: 'Criar Treino - Momentum Fit',
            clients: clientsRes.rows,
            selectedClientId
        });
    } catch (err) {
        console.error("Erro ao carregar formulário de treino:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar a página.' });
    }
});

// Processar Criação de Treino
router.post('/create', [
    body('client_id').isInt().withMessage('Cliente inválido'),
    body('title').notEmpty().withMessage('Título é obrigatório'),
    body('exercises').isArray({ min: 1 }).withMessage('Adicione pelo menos um exercício')
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { client_id, title, description, exercises } = req.body;
    const trainer_id = req.session.user.id; // O Super Admin também terá seu ID gravado aqui

    try {
        await pool.query(
            `INSERT INTO workouts (client_id, trainer_id, title, description, exercises)
             VALUES ($1, $2, $3, $4, $5)`,
            [client_id, trainer_id, title, description, JSON.stringify(exercises)]
        );

        // Notificar o cliente (Opcional - implementação futura)
        
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao criar treino:", err);
        res.status(500).json({ success: false, message: 'Erro interno ao salvar o treino.' });
    }
});

// Detalhes do Treino (Visualização)
router.get('/:id', async (req, res) => {
    const workoutId = req.params.id;
    try {
        const workoutRes = await pool.query(`
            SELECT w.*, u_trainer.name as trainer_name, u_client.name as client_name
            FROM workouts w
            LEFT JOIN users u_trainer ON w.trainer_id = u_trainer.id
            LEFT JOIN users u_client ON w.client_id = u_client.id
            WHERE w.id = $1
        `, [workoutId]);

        if (workoutRes.rows.length === 0) {
            return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        }

        const checkinsRes = await pool.query(
            'SELECT * FROM workout_checkins WHERE workout_id = $1 ORDER BY created_at DESC',
            [workoutId]
        );

        res.render('pages/workout-details', {
            title: 'Detalhes do Treino',
            workout: workoutRes.rows[0],
            exercises: workoutRes.rows[0].exercises,
            checkins: checkinsRes.rows
        });
    } catch (err) {
        console.error("Erro ao ver treino:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes do treino.' });
    }
});

// Registrar Check-in (Usado pelo cliente, mas a rota fica aqui por organização ou pode mover para client.js)
// Como está em workouts/:id/checkin, mantemos aqui mas verificamos permissão
router.post('/:id/checkin', async (req, res) => {
    if (req.session.user.role !== 'client') {
        return res.status(403).json({ success: false, message: 'Apenas clientes fazem check-in.' });
    }

    const workoutId = req.params.id;
    const clientId = req.session.user.id;
    const { completed, notes, rating } = req.body;

    try {
        await pool.query(
            `INSERT INTO workout_checkins (workout_id, client_id, completed, notes, rating)
             VALUES ($1, $2, $3, $4, $5)`,
            [workoutId, clientId, completed === 'true', notes, rating || null]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Erro no check-in:", err);
        res.status(500).json({ success: false, message: 'Erro ao registrar check-in.' });
    }
});

module.exports = router;
