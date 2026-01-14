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

// Placeholder Routes (Para o menu funcionar)
router.get('/evolution', (req, res) => res.render('pages/error', { message: 'Módulo de Evolução em breve!' }));
router.get('/plans', (req, res) => res.render('pages/error', { message: 'Gestão de Planos em breve!' }));

// --- ACTION ROUTES ---

// 1. Update Dados Pessoais
router.post('/profile/update-general', async (req, res) => {
    try {
        await db.updateUser(req.session.user.id, { name: req.body.name });
        req.session.user.name = req.body.name; // Update session
        
        // Atualiza birth_date e gender
        await db.updateClientProfileFull(req.session.user.id, {
            ...res.locals.clientData, // Mantem o resto
            birth_date: req.body.birth_date,
            gender: req.body.gender
        });
        res.redirect('/client/profile');
    } catch(e) { console.error(e); res.redirect('/client/profile?error=true'); }
});

// 2. Update Físico
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

// 3. Update Preferencias
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

// 4. Mudar Senha
router.post('/profile/change-password', async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    
    if (newPassword !== confirmNewPassword) return res.redirect('/client/profile?msg=pass_mismatch');
    
    // Pega usuario com senha (o do session nao tem hash)
    const userFull = await db.getUserById(req.session.user.id); // precisa garantir que esse metodo traga senha no db.js, se nao, fazer query manual
    // Hack rapido: getUserById geralmente retorna *
    
    const match = await bcrypt.compare(currentPassword, userFull.password);
    if (!match) return res.redirect('/client/profile?msg=wrong_curr_pass');
    
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.updateUserPassword(req.session.user.id, newHash);
    
    res.redirect('/client/profile?msg=success');
});


// --- NOVAS FUNCIONALIDADES CLIENTE ---

router.get('/evolution', async (req, res) => {
    try {
        // Busca histórico de peso e medidas
        const history = await db.query("SELECT * FROM profile_history WHERE client_id = $1 ORDER BY recorded_at ASC", [res.locals.clientData.id]);
        res.render('pages/client-evolution', { 
            title: 'Minha Evolução', user: req.session.user, history: history.rows,
            currentPage: '/client/evolution', csrfToken: req.csrfToken()
        });
    } catch(e) { res.render('pages/error'); }
});

router.get('/ai-coach', (req, res) => {
    res.render('pages/client-ai-coach', { 
        title: 'IA Coach', user: req.session.user, 
        currentPage: '/client/ai-coach', csrfToken: req.csrfToken()
    });
});

router.get('/plans', (req, res) => {
    res.render('pages/client-plans', { 
        title: 'Meu Plano', user: req.session.user, 
        currentPage: '/client/plans', csrfToken: req.csrfToken()
    });
});

module.exports = router;
