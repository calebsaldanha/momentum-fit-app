const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireClient = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
};

router.use(requireClient);

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        const profile = profileRes.rows[0] || {};

        const workoutsRes = await pool.query(`
            SELECT w.*, u.name as trainer_name 
            FROM workouts w 
            LEFT JOIN users u ON w.trainer_id = u.id 
            WHERE w.client_id = $1 
            ORDER BY w.created_at DESC LIMIT 5`, 
            [req.session.user.id]
        );
        
        let lastCheckin = null;
        try {
            const checkinRes = await pool.query("SELECT * FROM checkins WHERE user_id = $1 ORDER BY date DESC LIMIT 1", [req.session.user.id]);
            lastCheckin = checkinRes.rows[0];
        } catch (e) { console.log('Tabela checkins ainda não criada ou vazia'); }

        res.render('pages/client-dashboard', {
            title: 'Meu Painel',
            profile: profile,
            workouts: workoutsRes.rows,
            lastCheckin: lastCheckin,
            currentPage: 'dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar painel.' });
    }
});

// Perfil - Visualização
router.get('/profile', async (req, res) => {
    try {
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        const profile = profileRes.rows[0] || {};
        
        let imc = '--';
        if (profile.weight && profile.height) {
            const h = parseFloat(profile.height.toString().replace(',', '.'));
            const w = parseFloat(profile.weight.toString().replace(',', '.'));
            if (h > 0) imc = (w / (h * h)).toFixed(1);
        }

        res.render('pages/client-profile', {
            title: 'Meu Perfil',
            profile: profile,
            imc: imc,
            currentPage: 'profile'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar perfil.' });
    }
});

// Perfil - Atualização Completa
router.post('/profile', async (req, res) => {
    // Extrai TODOS os campos possíveis do formulário
    const { 
        name, phone, age, gender_identity, sex_assigned_at_birth, 
        hormonal_treatment, hormonal_details,
        weight, height, body_fat, 
        measure_waist, measure_hip, measure_arm, measure_leg,
        main_goal, secondary_goals, specific_event,
        medical_conditions, medications, injuries, surgeries, allergies,
        fitness_level, training_days, workout_preference, availability, equipment,
        sleep_hours, diet_description, challenges
    } = req.body;

    try {
        // 1. Atualiza nome na tabela de usuários base
        await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name, req.session.user.id]);
        
        // 2. Atualiza ou Cria o perfil com TODOS os dados
        const query = `
            INSERT INTO client_profiles (
                user_id, phone, age, gender_identity, sex_assigned_at_birth,
                hormonal_treatment, hormonal_details,
                weight, height, body_fat,
                measure_waist, measure_hip, measure_arm, measure_leg,
                main_goal, secondary_goals, specific_event,
                medical_conditions, medications, injuries, surgeries, allergies,
                fitness_level, training_days, workout_preference, availability, equipment,
                sleep_hours, diet_description, challenges
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
            )
            ON CONFLICT (user_id) DO UPDATE SET
                phone = EXCLUDED.phone, age = EXCLUDED.age, 
                gender_identity = EXCLUDED.gender_identity, sex_assigned_at_birth = EXCLUDED.sex_assigned_at_birth,
                hormonal_treatment = EXCLUDED.hormonal_treatment, hormonal_details = EXCLUDED.hormonal_details,
                weight = EXCLUDED.weight, height = EXCLUDED.height, body_fat = EXCLUDED.body_fat,
                measure_waist = EXCLUDED.measure_waist, measure_hip = EXCLUDED.measure_hip, 
                measure_arm = EXCLUDED.measure_arm, measure_leg = EXCLUDED.measure_leg,
                main_goal = EXCLUDED.main_goal, secondary_goals = EXCLUDED.secondary_goals, specific_event = EXCLUDED.specific_event,
                medical_conditions = EXCLUDED.medical_conditions, medications = EXCLUDED.medications, 
                injuries = EXCLUDED.injuries, surgeries = EXCLUDED.surgeries, allergies = EXCLUDED.allergies,
                fitness_level = EXCLUDED.fitness_level, training_days = EXCLUDED.training_days, 
                workout_preference = EXCLUDED.workout_preference, availability = EXCLUDED.availability, equipment = EXCLUDED.equipment,
                sleep_hours = EXCLUDED.sleep_hours, diet_description = EXCLUDED.diet_description, challenges = EXCLUDED.challenges
        `;

        const values = [
            req.session.user.id, phone, age, gender_identity, sex_assigned_at_birth,
            hormonal_treatment, hormonal_details,
            weight, height, body_fat,
            measure_waist, measure_hip, measure_arm, measure_leg,
            main_goal, secondary_goals, specific_event,
            medical_conditions, medications, injuries, surgeries, allergies,
            fitness_level, training_days, workout_preference, availability, equipment,
            sleep_hours, diet_description, challenges
        ];

        await pool.query(query, values);
        
        // 3. Registra histórico de peso se houver alteração
        if(weight) {
             try { await pool.query("INSERT INTO checkins (user_id, weight) VALUES ($1, $2)", [req.session.user.id, weight]); } catch(e){}
        }

        req.flash('success', 'Perfil atualizado com sucesso!');
        res.redirect('/client/profile');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro ao atualizar perfil.');
        res.redirect('/client/profile');
    }
});

// Meus Treinos
router.get('/workouts', async (req, res) => {
    try {
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        const profile = profileRes.rows[0] || {};

        const workouts = await pool.query(`
            SELECT w.*, u.name as trainer_name 
            FROM workouts w 
            LEFT JOIN users u ON w.trainer_id = u.id 
            WHERE w.client_id = $1 
            ORDER BY w.created_at DESC`, 
            [req.session.user.id]
        );

        res.render('pages/client-workouts', {
            title: 'Meus Treinos',
            workouts: workouts.rows,
            profile: profile, 
            currentPage: 'workouts'
        });
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao listar treinos.' }); 
    }
});

// Formulário Inicial (GET)
router.get('/initial-form', (req, res) => {
    res.render('pages/initial-form', { title: 'Avaliação', profile: {}, currentPage: 'profile' });
});

// Formulário Inicial (POST) - Agora salva TUDO
router.post('/initial-form', async (req, res) => {
     // Reutiliza a mesma lógica de campos do Profile, mas redireciona para dashboard
     const body = req.body;
     const userId = req.session.user.id;

     // Lista de campos (mesma do profile, simplificada para query)
     const fields = [
        'phone', 'age', 'gender_identity', 'sex_assigned_at_birth', 
        'hormonal_treatment', 'hormonal_details',
        'weight', 'height', 'body_fat', 
        'measure_waist', 'measure_hip', 'measure_arm', 'measure_leg',
        'main_goal', 'secondary_goals', 'specific_event',
        'medical_conditions', 'medications', 'injuries', 'surgeries', 'allergies',
        'fitness_level', 'training_days', 'workout_preference', 'availability', 'equipment',
        'sleep_hours', 'diet_description', 'challenges'
     ];

     try {
         // Constrói query dinâmica ou fixa
         const cols = ['user_id', ...fields].join(', ');
         const placeholders = fields.map((_, i) => `$${i + 2}`).join(', ');
         const values = [userId, ...fields.map(f => body[f])];

         const query = `
            INSERT INTO client_profiles (${cols}) 
            VALUES ($1, ${placeholders}) 
            ON CONFLICT (user_id) DO NOTHING
         `;

         await pool.query(query, values);

         if(body.weight) {
            try { await pool.query("INSERT INTO checkins (user_id, weight) VALUES ($1, $2)", [userId, body.weight]); } catch(e){}
         }
         
         await pool.query("UPDATE users SET status = 'pending_approval' WHERE id = $1", [userId]);
         res.redirect('/client/dashboard');
     } catch(e) { 
         console.error(e); 
         req.flash('error', 'Erro ao salvar formulário.');
         res.redirect('/client/initial-form'); 
     }
});


// --- NOVA ROTA: Alterar Minha Senha ---
router.post('/change-password', requireClient, async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    
    if (new_password !== confirm_password) {
        return res.redirect('/client/profile?error=Senhas não conferem');
    }

    try {
        // Verificar senha atual
        const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [req.session.user.id]);
        const user = userRes.rows[0];

        if (!await bcrypt.compare(current_password, user.password)) {
             return res.redirect('/client/profile?error=Senha atual incorreta');
        }

        // Atualizar
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, req.session.user.id]);
        
        res.redirect('/client/profile?success=Senha alterada com sucesso');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao alterar senha.' });
    }
});

module.exports = router;
