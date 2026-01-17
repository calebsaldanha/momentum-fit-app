const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewWorkoutEmail } = require('../utils/emailService');

// Middleware de Permissão
const requireTrainer = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin' || req.session.user.role === 'admin')) {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado. Apenas treinadores ou admins.', user: req.session.user });
};

router.get('/', requireTrainer, async (req, res) => {
    if (req.session.user.role === 'client') return res.redirect('/client/dashboard');
    if (req.session.user.role === 'trainer') return res.redirect('/trainer/dashboard');
    res.redirect('/admin/dashboard');
});

// GET: Página de Criação
router.get('/create', requireTrainer, async (req, res) => {
    const clientId = req.query.client_id;
    try {
        let selectedClient = null;
        if (clientId) {
            const clientRes = await pool.query("SELECT id, name FROM users WHERE id = $1", [clientId]);
            selectedClient = clientRes.rows[0];
        }

        const allClientsRes = await pool.query("SELECT id, name FROM users WHERE role = 'client' ORDER BY name ASC");
        const exercisesRes = await pool.query("SELECT * FROM exercise_library ORDER BY name ASC");
        
        res.render('pages/create-workout', { 
            title: 'Novo Treino', 
            user: req.session.user, 
            selectedClient: selectedClient, 
            clients: allClientsRes.rows,
            selectedClientId: clientId, 
            exerciseLibrary: exercisesRes.rows, 
            csrfToken: req.csrfToken(),
            currentPage: 'create-workout' 
        });
    } catch (err) {
        console.error("Erro create workout page:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar página.', user: req.session.user });
    }
});

// POST: Salvar Novo Treino (COM TRANSAÇÃO)
router.post('/create', requireTrainer, async (req, res) => {
    const { client_id, title, day_of_week, description, exercises } = req.body; 
    
    // Inicia conexão dedicada para transação
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // <--- INÍCIO DA TRANSAÇÃO

        // 1. Validação: O aluno existe e tem perfil?
        const clientRes = await client.query("SELECT id FROM clients WHERE user_id = $1", [client_id]);
        
        if (clientRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Este usuário não completou o cadastro (Anamnese faltando).' });
        }

        const realClientId = clientRes.rows[0].id;

        // 2. Insere Treino
        const workoutResult = await client.query(
            `INSERT INTO workouts 
            (user_id, client_id, trainer_id, title, day_of_week, description, status, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW()) 
            RETURNING id`,
            [client_id, realClientId, req.session.user.id, title, day_of_week, description]
        );
        const workoutId = workoutResult.rows[0].id;

        // 3. Insere Exercícios
        let exList = [];
        try {
            exList = typeof exercises === 'string' ? JSON.parse(exercises) : exercises;
        } catch (e) {
            throw new Error("Formato de exercícios inválido.");
        }

        if (Array.isArray(exList) && exList.length > 0) {
            for (let ex of exList) {
                let libraryId = ex.id || null; 
                if (libraryId === '') libraryId = null;
                
                // Busca nome se vier da biblioteca
                let exerciseName = ex.name;
                if (libraryId) {
                    const libRes = await client.query("SELECT name FROM exercise_library WHERE id = $1", [libraryId]);
                    if (libRes.rows[0]) exerciseName = libRes.rows[0].name;
                }
                if (!exerciseName) exerciseName = 'Exercício';

                await client.query(
                    `INSERT INTO workout_exercises 
                    (workout_id, library_id, name, sets, reps, weight, notes, video_url, image_url, order_index) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [workoutId, libraryId, exerciseName, ex.sets, ex.reps, ex.weight, ex.notes, ex.video_url, ex.image_url, ex.order_index]
                );
            }
        }

        await client.query('COMMIT'); // <--- SUCESSO: EFETIVA TUDO

        // Envia email fora da transação (não bloqueante)
        const userRes = await pool.query("SELECT name, email FROM users WHERE id = $1", [client_id]);
        if (userRes.rows[0]) {
            sendNewWorkoutEmail(userRes.rows[0].email, title, userRes.rows[0].name, req.headers.host).catch(console.error);
        }

        res.json({ success: true, clientId: client_id });

    } catch (err) {
        await client.query('ROLLBACK'); // <--- ERRO: DESFAZ TUDO
        console.error("Erro CRÍTICO ao salvar treino:", err);
        res.status(500).json({ success: false, message: 'Erro interno ao salvar treino. Tente novamente.' });
    } finally {
        client.release();
    }
});

// GET: Página de Edição
router.get('/edit/:id', requireTrainer, async (req, res) => {
    try {
        const workoutId = req.params.id;
        
        let workoutQuery = "SELECT * FROM workouts WHERE id = $1";
        const queryParams = [workoutId];

        // Se for admin, vê tudo. Se for trainer, vê apenas seus treinos (Opcional: ou todos se for colaborativo)
        // Para simplificar e evitar erros, permitimos que treinadores vejam treinos uns dos outros por enquanto,
        // mas você pode descomentar abaixo para restringir:
        /*
        if (req.session.user.role === 'trainer') {
            workoutQuery += " AND trainer_id = $2";
            queryParams.push(req.session.user.id);
        }
        */

        const workoutRes = await pool.query(workoutQuery, queryParams);
        const workout = workoutRes.rows[0];

        if (!workout) return res.status(404).render('pages/error', { message: 'Treino não encontrado.', user: req.session.user });

        const userId = workout.user_id;
        const clientRes = await pool.query("SELECT id, name FROM users WHERE id = $1", [userId]);
        const selectedClient = clientRes.rows[0];

        const currentExercisesRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC", [workoutId]);
        const exercisesRes = await pool.query("SELECT * FROM exercise_library ORDER BY name ASC");
        
        res.render('pages/edit-workout', { 
            title: 'Editar Treino', 
            user: req.session.user,
            workout: workout,
            currentExercises: currentExercisesRes.rows,
            selectedClient: selectedClient,
            selectedClientId: userId,
            exerciseLibrary: exercisesRes.rows,
            csrfToken: req.csrfToken(),
            currentPage: 'create-workout' 
        });
    } catch (err) {
        console.error("Erro edit workout:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.', user: req.session.user });
    }
});

// POST: Atualizar Treino (COM TRANSAÇÃO)
router.post('/edit/:id', requireTrainer, async (req, res) => {
    const workoutId = req.params.id;
    const { title, day_of_week, description, exercises } = req.body;
    
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Update básico
        const result = await client.query(
            "UPDATE workouts SET title = $1, day_of_week = $2, description = $3 WHERE id = $4 RETURNING user_id", 
            [title, day_of_week, description, workoutId]
        );
        
        if (result.rowCount === 0) {
             await client.query('ROLLBACK');
             return res.status(404).json({ success: false, message: 'Treino não encontrado.' });
        }

        // Substituir exercícios (Deleta todos antigos e recria)
        await client.query("DELETE FROM workout_exercises WHERE workout_id = $1", [workoutId]);

        let exList = typeof exercises === 'string' ? JSON.parse(exercises) : exercises;
        
        if (Array.isArray(exList)) {
            for (let ex of exList) {
                let exerciseName = ex.name || 'Exercício';
                let libraryId = ex.id || null;
                if (libraryId === '') libraryId = null;

                if (libraryId) {
                    const libRes = await client.query("SELECT name FROM exercise_library WHERE id = $1", [libraryId]);
                    if (libRes.rows[0]) exerciseName = libRes.rows[0].name;
                }

                await client.query(
                    `INSERT INTO workout_exercises 
                    (workout_id, library_id, name, sets, reps, weight, notes, video_url, image_url, order_index) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [workoutId, libraryId, exerciseName, ex.sets, ex.reps, ex.weight, ex.notes, ex.video_url, ex.image_url, ex.order_index]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, clientId: result.rows[0].user_id });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro update workout:", err);
        res.status(500).json({ success: false, message: 'Erro ao atualizar treino.' });
    } finally {
        client.release();
    }
});

router.post('/delete/:id', requireTrainer, async (req, res) => {
    try {
        await pool.query("DELETE FROM workouts WHERE id = $1", [req.params.id]);
        res.redirect(req.get('referer') || '/trainer/dashboard');
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: "Erro ao excluir", user: req.session.user }); 
    }
});

    
router.get('/library', (req, res) => {
    res.render('pages/trainer-library', { 
        title: 'Biblioteca de Exercícios', user: req.session.user, 
        currentPage: '/workouts/library', csrfToken: req.csrfToken() 
    });
});


// --- ROTAS DE TEMPLATES ---

// API: Listar Templates do Treinador (para o Modal)
router.get('/api/templates', requireTrainer, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM workout_templates 
            WHERE trainer_id = $1 
            ORDER BY created_at DESC
        `, [req.session.user.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar templates' });
    }
});

// API: Carregar Detalhes de um Template
router.get('/api/templates/:id', requireTrainer, async (req, res) => {
    try {
        const templateRes = await pool.query("SELECT * FROM workout_templates WHERE id = $1 AND trainer_id = $2", [req.params.id, req.session.user.id]);
        if (templateRes.rows.length === 0) return res.status(404).json({ error: 'Template não encontrado' });

        const exercisesRes = await pool.query("SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY order_index ASC", [req.params.id]);
        
        res.json({
            template: templateRes.rows[0],
            exercises: exercisesRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao carregar exercícios' });
    }
});

// POST: Salvar Treino como Template
router.post('/templates/save', requireTrainer, async (req, res) => {
    const { title, description, exercises } = req.body;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const tmplRes = await client.query(`
            INSERT INTO workout_templates (trainer_id, title, description)
            VALUES ($1, $2, $3) RETURNING id
        `, [req.session.user.id, title, description]);
        
        const templateId = tmplRes.rows[0].id;

        let exList = typeof exercises === 'string' ? JSON.parse(exercises) : exercises;
        
        if (Array.isArray(exList)) {
            for (let ex of exList) {
                let exerciseName = ex.name || 'Exercício';
                await client.query(`
                    INSERT INTO template_exercises 
                    (template_id, library_id, name, sets, reps, notes, order_index)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [templateId, ex.id || null, exerciseName, ex.sets, ex.reps, ex.notes, ex.order_index]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Template salvo com sucesso!' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao salvar template.' });
    } finally {
        client.release();
    }
});

module.exports = router;
