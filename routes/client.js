const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const bcrypt = require('bcryptjs');
const { sendPasswordChangedEmail } = require('../utils/emailService');

const requireClient = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') {
        return next();
    }
    res.redirect('/auth/login');
};

router.get('/dashboard', requireClient, async (req, res) => {
    try {
        // Stats básicos
        const stats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'completed') as completed_workouts,
                COUNT(DISTINCT created_at::date) as active_days
            FROM workout_logs 
            WHERE user_id = $1
        `, [req.session.user.id]);

        res.render('pages/client-dashboard', { 
            title: 'Painel do Aluno', 
            user: req.session.user,
            stats: stats.rows[0] || { completed_workouts: 0, active_days: 0 },
            currentPage: 'dashboard'
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro no dashboard.' });
    }
});

router.get('/workouts', requireClient, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM workouts WHERE user_id = $1 ORDER BY created_at DESC", [req.session.user.id]);
        res.render('pages/client-workouts', { 
            title: 'Meus Treinos', 
            user: req.session.user, 
            workouts: result.rows,
            currentPage: 'workouts'
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar treinos.' });
    }
});

router.get('/profile', requireClient, async (req, res) => {
    res.render('pages/client-profile', { 
        title: 'Meu Perfil', 
        user: req.session.user, 
        csrfToken: res.locals.csrfToken,
        currentPage: 'profile'
    });
});

// ALTERAR SENHA (USUÁRIO)
router.post('/change-password', requireClient, async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    
    if (new_password !== confirm_password) {
        return res.redirect('/client/profile?error=Senhas não conferem');
    }

    try {
        const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [req.session.user.id]);
        const user = userRes.rows[0];

        if (!await bcrypt.compare(current_password, user.password)) {
             return res.redirect('/client/profile?error=Senha atual incorreta');
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, req.session.user.id]);
        
        // NOTIFICAÇÃO: Confirmação
        sendPasswordChangedEmail(user.email, user.name).catch(console.error);

        res.redirect('/client/profile?success=Senha alterada com sucesso');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao alterar senha.' });
    }
});

module.exports = router;
