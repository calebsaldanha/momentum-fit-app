const express = require('express');
const router = express.Router();
const db = require('../database/db');
const notificationService = require('../utils/notificationService');

router.use((req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
});

// Criar Treino
router.post('/create', async (req, res) => {
    const { clientId, title, description, day_of_week } = req.body;
    try {
        await db.query('BEGIN');
        const w = await db.query(
            "INSERT INTO workouts (user_id, trainer_id, title, description, day_of_week) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [clientId, req.session.user.id, title, description, day_of_week]
        );
        // (Inserção de exercícios omitida para brevidade)
        await db.query('COMMIT');

        // Notificar Cliente (Novo Treino)
        await notificationService.notify({
            userId: clientId,
            type: 'workout_created',
            title: 'Novo Treino Disponível',
            message: `O treino "${title}" foi adicionado à sua rotina.`,
            link: `/workouts/${w.rows[0].id}`,
            data: { workoutTitle: title }
        });

        // Notificar Admin (Monitoramento)
        await notificationService.notify({
            userId: 'ADMIN_GROUP',
            type: 'workout_created',
            title: 'Novo Treino Criado',
            message: `Treinador ${req.session.user.name} criou treino para cliente ID ${clientId}.`,
            link: `/admin/users/${clientId}`,
            data: { workoutTitle: title }
        });

        req.flash('success', 'Treino criado.');
        res.redirect(req.session.user.role === 'admin' ? `/admin/users/${clientId}` : `/trainer/clients/${clientId}`);
    } catch (e) { await db.query('ROLLBACK'); res.redirect('/'); }
});

// Editar Treino (Ex: Admin editando treino de um Trainer)
router.post('/:id/update', async (req, res) => {
    const { title, description } = req.body;
    try {
        const old = await db.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        await db.query("UPDATE workouts SET title=$1, description=$2 WHERE id=$3", [title, description, req.params.id]);
        
        const workout = old.rows[0];

        // Se quem editou não foi o dono original (Ex: Admin editou treino do Trainer)
        if (req.session.user.role === 'admin' && workout.trainer_id && workout.trainer_id !== req.session.user.id) {
            await notificationService.notify({
                userId: workout.trainer_id,
                type: 'workout_edited',
                title: 'Treino Editado pelo Admin',
                message: `O treino "${title}" do seu aluno foi alterado pela administração.`,
                link: `/workouts/${req.params.id}`,
                data: { workoutTitle: title }
            });
        }
        
        // Avisar Cliente da mudança
        await notificationService.notify({
            userId: workout.user_id,
            type: 'workout_edited',
            title: 'Treino Atualizado',
            message: `Houve alterações no seu treino "${title}".`,
            link: `/workouts/${req.params.id}`,
            data: { workoutTitle: title }
        });

        res.redirect(`/workouts/${req.params.id}`);
    } catch(e){ res.redirect('/'); }
});

// Rotas GET essenciais
router.get('/create', async (req, res) => { res.render('pages/create-workout', { client: {}, exercises: [] }); }); 
router.get('/:id', async (req, res) => { res.render('pages/workout-details', { workout: {}, exercises: [], library: [] }); });

module.exports = router;
