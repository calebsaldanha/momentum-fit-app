const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
};

router.use(requireTrainerAuth);

router.get('/profile', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const userResult = await pool.query("SELECT status FROM users WHERE id = $1", [userId]);
        const profileResult = await pool.query("SELECT * FROM trainer_profiles WHERE user_id = $1", [userId]);
        
        res.render('pages/pending-trainer', {
            title: 'Complete seu Perfil Profissional - Momentum Fit',
            userStatus: userResult.rows[0].status,
            profile: profileResult.rows[0] || {}
        });
    } catch (err) {
        console.error("Erro ao carregar perfil do treinador:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível carregar seu perfil.' });
    }
});

router.post('/profile', async (req, res) => {
    const userId = req.session.user.id;
    const { certifications, experience, bio } = req.body;

    try {
        await pool.query(`
            INSERT INTO trainer_profiles (user_id, certifications, experience, bio, profile_submitted)
            VALUES ($1, $2, $3, $4, true)
            ON CONFLICT (user_id) DO UPDATE SET
                certifications = EXCLUDED.certifications,
                experience = EXCLUDED.experience,
                bio = EXCLUDED.bio,
                profile_submitted = true;
        `, [userId, certifications, experience, bio]);

        await pool.query("UPDATE users SET status = 'pending_approval' WHERE id = $1", [userId]);
        
        res.redirect('/trainer/profile');
    } catch (err) {
        console.error("Erro ao salvar perfil do treinador:", err);
        res.status(500).render('pages/error', { message: 'Ocorreu um erro ao salvar suas informações.' });
    }
});

module.exports = router;
