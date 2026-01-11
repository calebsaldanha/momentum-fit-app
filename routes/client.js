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

// Rota auxiliar para verificar se o perfil está completo
function checkMissingProfile(client) {
    if (!client) return true;
    // Consideramos incompleto se faltar peso ou altura, que são críticos
    if (!client.height || !client.current_weight) return true;
    return false;
}

// Dashboard do Cliente
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        // Busca dados do usuário e do cliente
        const clientQuery = `
            SELECT u.name, u.email, u.profile_image, c.id as client_real_id, c.* FROM users u 
            LEFT JOIN clients c ON u.id = c.user_id 
            WHERE u.id = $1
        `;
        
        const clientRes = await db.query(clientQuery, [req.session.user.id]);
        const clientData = clientRes.rows[0];

        let workouts = [];
        let missingProfile = true; // Default true se não achar cliente

        // Se o cliente existe e tem ID vinculado
        if (clientData && clientData.client_real_id) {
            missingProfile = checkMissingProfile(clientData);

            const workoutsQuery = `
                SELECT w.*, u.name as trainer_name 
                FROM workouts w
                LEFT JOIN trainers t ON w.trainer_id = t.id
                LEFT JOIN users u ON t.user_id = u.id
                WHERE w.client_id = $1 AND w.status = 'pending' 
                ORDER BY w.date ASC LIMIT 3
            `;
            const workoutsRes = await db.query(workoutsQuery, [clientData.client_real_id]);
            workouts = workoutsRes.rows;
        }

        res.render('pages/client-dashboard', { 
            title: 'Painel do Aluno',
            user: req.session.user,
            clientProfile: clientData || {},
            missingProfile: missingProfile,
            workouts: workouts || []
        });

    } catch (err) {
        console.error("Erro dashboard:", err);
        return res.render('pages/error', { 
            title: 'Erro',
            message: "Erro ao carregar dashboard" 
        });
    }
});

// GET - Exibir Formulário Inicial (Anamnese)
router.get('/initial-form', isAuthenticated, async (req, res) => {
    try {
        const query = `
            SELECT u.name, u.email, c.* FROM users u 
            LEFT JOIN clients c ON u.id = c.user_id 
            WHERE u.id = $1
        `;
        const { rows } = await db.query(query, [req.session.user.id]);
        
        res.render('pages/initial-form', { 
            title: 'Anamnese',
            user: req.session.user,
            profile: rows[0] || {},
            error: null,
            csrfToken: '' // Se usar CSRF futuramente
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { title: 'Erro', message: "Erro ao carregar formulário" });
    }
});

// POST - Processar Formulário Inicial
router.post('/initial-form', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    // Extrai campos do form. Nota: mapeamos 'age' para logica de backend se necessario, 
    // mas o schema atual usa 'birth_date'. Vamos focar nos campos que batem com o schema.
    const { 
        phone, weight, height, main_goal, 
        injuries, medications, diet_description, 
        training_days, availability, fitness_level 
    } = req.body;

    // Concatena informações extras para não perder dados do form rico
    const lifestyleConcat = `Dieta: ${diet_description || ''}. Sono: ${req.body.sleep_hours || ''}h. Desafios: ${req.body.challenges || ''}`;
    const availabilityConcat = `Dias: ${training_days}. Tempo: ${availability}. Local: ${req.body.workout_preference}`;
    const medicalConcat = `Condições: ${req.body.medical_conditions || ''}. Cirurgias: ${req.body.surgeries || ''}. Alergias: ${req.body.allergies || ''}`;

    try {
        // Verifica se cliente existe
        const check = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
        
        if (check.rows.length > 0) {
            // UPDATE
            await db.query(`
                UPDATE clients SET 
                phone = $1, current_weight = $2, height = $3, fitness_goals = $4,
                injuries = $5, medications = $6, lifestyle = $7, availability = $8
                WHERE user_id = $9
            `, [
                phone, weight, height, main_goal, 
                (injuries + ' ' + medicalConcat), medications, lifestyleConcat, availabilityConcat,
                userId
            ]);
        } else {
            // INSERT (caso raro se o registro falhou antes)
            await db.query(`
                INSERT INTO clients (user_id, phone, current_weight, height, fitness_goals, injuries, medications, lifestyle, availability)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                userId, phone, weight, height, main_goal,
                (injuries + ' ' + medicalConcat), medications, lifestyleConcat, availabilityConcat
            ]);
        }

        res.redirect('/client/dashboard?onboarding=success');

    } catch (err) {
        console.error("Erro ao salvar anamnese:", err);
        res.render('pages/initial-form', { 
            title: 'Anamnese',
            user: req.session.user,
            profile: req.body, // Devolve o que o usuário digitou
            error: 'Erro ao salvar dados. Tente novamente.',
            csrfToken: ''
        });
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
            title: 'Meu Perfil',
            user: req.session.user,
            clientProfile: rows[0] || {} 
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { title: 'Erro', message: "Erro ao carregar perfil" });
    }
});

// ATUALIZAR Perfil (Rota existente mantida)
router.post('/profile', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const { 
        name, phone, birth_date, gender,
        height, current_weight, fitness_goals,
        injuries, medications, lifestyle, availability 
    } = req.body;

    try {
        await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
        
        // Upsert simplificado via check
        const check = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
        
        if (check.rows.length > 0) {
            await db.query(`UPDATE clients SET 
                phone = $1, birth_date = $2, gender = $3,
                height = $4, current_weight = $5, fitness_goals = $6,
                injuries = $7, medications = $8, lifestyle = $9, availability = $10
                WHERE user_id = $11`, 
                [phone, birth_date, gender, height, current_weight, fitness_goals, injuries, medications, lifestyle, availability, userId]
            );
        } else {
            await db.query(`INSERT INTO clients (user_id, phone, birth_date, gender, height, current_weight, fitness_goals, injuries, medications, lifestyle, availability) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [userId, phone, birth_date, gender, height, current_weight, fitness_goals, injuries, medications, lifestyle, availability]
            );
        }

        req.session.user.name = name;
        res.redirect('/client/profile?success=true');

    } catch (err) {
        console.error("Erro update perfil:", err);
        res.redirect('/client/profile?error=update_failed');
    }
});

// Meus Treinos
router.get('/workouts', isAuthenticated, async (req, res) => {
    try {
        const clientRes = await db.query("SELECT id FROM clients WHERE user_id = $1", [req.session.user.id]);
        const clientData = clientRes.rows[0];

        if (!clientData) return res.redirect('/client/dashboard');

        const workoutsRes = await db.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY date DESC", [clientData.id]);
        
        res.render('pages/client-workouts', { 
            title: 'Meus Treinos',
            user: req.session.user,
            workouts: workoutsRes.rows 
        });
    } catch (err) {
        console.error(err);
        res.redirect('/client/dashboard');
    }
});

module.exports = router;
