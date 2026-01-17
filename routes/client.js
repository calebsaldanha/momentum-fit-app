const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/auth/login');
}

// Middleware: Carrega perfil
async function requireClientData(req, res, next) {
    try {
        let clientData = await db.getClientData(req.session.user.id);
        if (!clientData || !clientData.id) {
             clientData = await db.ensureClientProfile(req.session.user.id);
        }
        res.locals.clientData = clientData;
        next();
    } catch (err) {
        console.error(err);
        res.redirect('/auth/login');
    }
}

router.use(isAuthenticated);
router.use(requireClientData);

// --- VIEW ROUTES ---

router.get('/dashboard', async (req, res) => {
    try {
        const recentWorkouts = await db.getClientWorkouts(res.locals.clientData.id, 3);
        const stats = await db.getClientStats(req.session.user.id);
        res.render('pages/client-dashboard', { 
            title: 'Painel do Aluno', user: req.session.user, clientData: res.locals.clientData, 
            workouts: recentWorkouts, stats: stats, currentPage: '/client/dashboard', csrfToken: req.csrfToken()
        });
    } catch (e) { res.render('pages/error'); }
});

router.get('/profile', (req, res) => {
    res.render('pages/client-profile', { 
        title: 'Meu Perfil', user: req.session.user, clientData: res.locals.clientData, 
        currentPage: '/client/profile', csrfToken: req.csrfToken()
    });
});

router.get('/workouts', async (req, res) => {
    const workouts = await db.getClientWorkouts(res.locals.clientData.id);
    res.render('pages/client-workouts', { 
        title: 'Meus Treinos', user: req.session.user, workouts: workouts, 
        currentPage: '/client/workouts', csrfToken: req.csrfToken() 
    });
});

// --- NOVO: MODO EXECUÇÃO DE TREINO ---
router.get('/workout/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        
        // Busca treino e valida se pertence ao aluno logado
        const workoutRes = await db.query(`
            SELECT * FROM workouts 
            WHERE id = $1 AND client_id = $2
        `, [workoutId, res.locals.clientData.id]);

        if (workoutRes.rows.length === 0) {
            return res.redirect('/client/workouts');
        }

        const workout = workoutRes.rows[0];
        
        // Busca exercícios
        const exercisesRes = await db.query(`
            SELECT * FROM workout_exercises 
            WHERE workout_id = $1 
            ORDER BY order_index ASC
        `, [workoutId]);

        res.render('pages/client-workout-play', { 
            title: `Treinar: ${workout.title}`,
            user: req.session.user,
            workout: workout,
            exercises: exercisesRes.rows,
            currentPage: '/client/workouts',
            csrfToken: req.csrfToken()
        });

    } catch (e) {
        console.error(e);
        res.render('pages/error', { message: 'Erro ao carregar treino.' });
    }
});

// --- NOVO: FINALIZAR TREINO (POST) ---
router.post('/workout/:id/complete', async (req, res) => {
    const workoutId = req.params.id;
    const { logs, feedback_text, effort_level } = req.body;
    // logs deve ser um objeto: { exercise_id: { weight: '...', reps: '...' }, ... }

    try {
        // Validação de segurança
        const checkOwner = await db.query("SELECT id FROM workouts WHERE id = $1 AND client_id = $2", [workoutId, res.locals.clientData.id]);
        if (checkOwner.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });

        // 1. Salvar Logs de cada exercício
        if (logs) {
            for (const [exId, data] of Object.entries(logs)) {
                await db.query(`
                    UPDATE workout_exercises 
                    SET log_weight = $1, log_reps = $2, is_completed = TRUE
                    WHERE id = $3 AND workout_id = $4
                `, [data.weight, data.reps, exId, workoutId]);
            }
        }

        // 2. Criar Check-in
        await db.query(`
            INSERT INTO checkins (user_id, workout_id, date, feedback_text, effort_level)
            VALUES ($1, $2, NOW(), $3, $4)
        `, [req.session.user.id, workoutId, feedback_text, effort_level]);

        // 3. Atualizar Treino (Status e Data)
        await db.query(`
            UPDATE workouts 
            SET status = 'completed', finished_at = NOW() 
            WHERE id = $1
        `, [workoutId]);

        // 4. (Opcional) Atualizar Peso no perfil se informado no feedback? (Deixar para depois)

        res.json({ success: true, redirect: '/client/dashboard' });

    } catch (e) {
        console.error("Erro ao finalizar treino:", e);
        res.status(500).json({ error: 'Erro interno ao salvar.' });
    }
});


// --- ACTION ROUTES (PERFIL) ---

router.post('/profile/update-general', async (req, res) => {
    try {
        await db.updateUser(req.session.user.id, { name: req.body.name });
        req.session.user.name = req.body.name;
        await db.updateClientProfileFull(req.session.user.id, {
            ...res.locals.clientData,
            birth_date: req.body.birth_date,
            gender: req.body.gender
        });
        res.redirect('/client/profile');
    } catch(e) { console.error(e); res.redirect('/client/profile?error=true'); }
});

router.post('/profile/update-physical', async (req, res) => {
    try {
        await db.updateClientProfileFull(req.session.user.id, {
            ...res.locals.clientData,
            height: req.body.height,
            current_weight: req.body.weight,
            activity_level: req.body.activity_level,
            medical_conditions: req.body.medical_conditions
        });
        res.redirect('/client/profile');
    } catch(e) { console.error(e); res.redirect('/client/profile?error=true'); }
});

router.post('/profile/update-preferences', async (req, res) => {
    try {
        await db.updateClientProfileFull(req.session.user.id, {
            ...res.locals.clientData,
            fitness_goals: req.body.goals,
            training_days: req.body.training_days,
            available_equipment: req.body.available_equipment
        });
        res.redirect('/client/profile');
    } catch(e) { console.error(e); res.redirect('/client/profile?error=true'); }
});

router.post('/profile/change-password', async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (newPassword !== confirmNewPassword) return res.redirect('/client/profile?msg=pass_mismatch');
    const userFull = await db.getUserById(req.session.user.id); 
    const match = await bcrypt.compare(currentPassword, userFull.password);
    if (!match) return res.redirect('/client/profile?msg=wrong_curr_pass');
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.updateUserPassword(req.session.user.id, newHash);
    res.redirect('/client/profile?msg=success');
});

// --- OUTRAS ROTAS ---
router.get('/evolution', async (req, res) => {
    try {
        const history = await db.query("SELECT * FROM profile_history WHERE client_id = $1 ORDER BY recorded_at ASC", [res.locals.clientData.id]);
        res.render('pages/client-evolution', { 
            title: 'Minha Evolução', user: req.session.user, history: history.rows,
            currentPage: '/client/evolution', csrfToken: req.csrfToken()
        });
    } catch(e) { res.render('pages/error'); }
});

router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach', { title: 'IA Coach', user: req.session.user, currentPage: '/client/ai-coach', csrfToken: req.csrfToken() }));
router.get('/plans', (req, res) => res.render('pages/client-plans', { title: 'Meu Plano', user: req.session.user, currentPage: '/client/plans', csrfToken: req.csrfToken() }));
router.get('/content', (req, res) => res.render('pages/client-content', { title: 'Conteúdos Salvos', user: req.session.user, currentPage: '/client/content', csrfToken: req.csrfToken() }));
router.get('/settings', (req, res) => res.render('pages/client-settings', { title: 'Configurações', user: req.session.user, currentPage: '/client/settings', csrfToken: req.csrfToken() }));

module.exports = router;
