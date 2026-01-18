const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
}

router.use(isAdmin);

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const totalUsers = await db.query('SELECT COUNT(*) FROM users');
        const pending = await db.query('SELECT COUNT(*) FROM trainers WHERE is_approved = false');
        let activePlansCount = 0;
        try {
            const activePlans = await db.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'");
            activePlansCount = activePlans.rows[0].count;
        } catch(e) {}
        
        res.render('pages/admin-dashboard', { 
            stats: { 
                totalUsers: totalUsers.rows[0].count, 
                pendingApprovals: pending.rows[0].count,
                activePlans: activePlansCount
            } 
        });
    } catch (err) {
        res.render('pages/admin-dashboard', { stats: { totalUsers: 0, pendingApprovals: 0, activePlans: 0 } });
    }
});

// Usuários Lista
router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC");
        res.render('pages/admin-clients', { users: result.rows });
    } catch (err) {
        res.render('pages/admin-clients', { users: [], messages: { error: 'Erro ao carregar lista.' } });
    }
});

// Detalhes do Usuário
router.get('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const userRes = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
        if (userRes.rows.length === 0) return res.redirect('/admin/users');
        const targetUser = userRes.rows[0];

        let data = { targetUser, details: {}, bi: {}, history: [] };

        if (targetUser.role === 'client') {
            const clientRes = await db.query("SELECT * FROM clients WHERE user_id = $1", [userId]);
            data.details = clientRes.rows[0] || {};
            
            // Corrige exibição de Nulo para string vazia para não quebrar a view
            for (let key in data.details) {
                if (data.details[key] === null) data.details[key] = '';
            }

            if (targetUser.trainer_id) {
                const trainerRes = await db.query("SELECT name FROM users WHERE id = $1", [targetUser.trainer_id]);
                data.details.trainerName = trainerRes.rows[0]?.name;
            }

            // Lista de treinadores (Aprovados E Pendentes)
            const allTrainers = await db.query(`
                SELECT u.id, u.name, t.is_approved 
                FROM users u JOIN trainers t ON u.id = t.user_id 
                WHERE u.role = 'trainer' ORDER BY u.name ASC
            `);
            data.allTrainers = allTrainers.rows;

            try {
                const activePlan = await db.query("SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1", [userId]);
                data.activePlan = activePlan.rows[0];
                const planHistory = await db.query("SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
                data.financialHistory = planHistory.rows;
            } catch (e) { data.financialHistory = []; }

            try {
                const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [userId]);
                data.workouts = workouts.rows; 
                data.bi = { totalWorkouts: workouts.rows.length, attendanceRate: 85 };
            } catch (e) { data.workouts = []; }

        } else if (targetUser.role === 'trainer') {
            const trainerRes = await db.query("SELECT * FROM trainers WHERE user_id = $1", [userId]);
            data.details = trainerRes.rows[0] || { is_approved: false };
            
            const students = await db.query("SELECT COUNT(*) FROM users WHERE trainer_id = $1", [userId]);
            data.bi = { activeStudents: students.rows[0].count, totalRevenue: 0 };
        }

        res.render('pages/admin-user-details', data);

    } catch (err) {
        console.error("Erro Admin Details:", err);
        req.flash('error', 'Erro ao carregar detalhes.');
        res.redirect('/admin/users');
    }
});

// Ações
router.post('/users/:id/toggle-status', async (req, res) => {
    await db.query("UPDATE users SET active = NOT active WHERE id = $1", [req.params.id]);
    res.redirect(`/admin/users/${req.params.id}`);
});

router.post('/users/:id/delete', async (req, res) => {
    const userId = req.params.id;
    try {
        await db.query('BEGIN');
        await db.query("DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = $1)", [userId]);
        await db.query("DELETE FROM workouts WHERE user_id = $1", [userId]);
        try { await db.query("DELETE FROM payments WHERE user_id = $1", [userId]); } catch(e){}
        try { await db.query("DELETE FROM subscriptions WHERE user_id = $1", [userId]); } catch(e){}
        await db.query("DELETE FROM clients WHERE user_id = $1", [userId]);
        await db.query("DELETE FROM trainers WHERE user_id = $1", [userId]);
        await db.query("DELETE FROM users WHERE id = $1", [userId]);
        await db.query('COMMIT');
        req.flash('success', 'Usuário excluído.');
        res.redirect('/admin/users');
    } catch (err) {
        await db.query('ROLLBACK');
        res.redirect(`/admin/users/${userId}`);
    }
});

router.post('/users/:id/assign-trainer', async (req, res) => {
    const { trainer_id } = req.body;
    await db.query("UPDATE users SET trainer_id = $1 WHERE id = $2", [trainer_id === 'none' ? null : trainer_id, req.params.id]);
    req.flash('success', 'Treinador atualizado.');
    res.redirect(`/admin/users/${req.params.id}`);
});

// APROVAÇÃO (CORREÇÃO DE ROTA)
// Esta rota deve receber o ID do USUÁRIO (user_id) que está na URL e atualizar a tabela TRAINERS
router.post('/users/:id/approve-trainer', async (req, res) => {
    const userId = req.params.id;
    try {
        console.log(`Aprovando treinador com User ID: ${userId}`); // Log para debug
        
        // Verifica se o registro existe antes
        const trainerCheck = await db.query('SELECT * FROM trainers WHERE user_id = $1', [userId]);
        
        if (trainerCheck.rows.length === 0) {
            // Se não existir na tabela trainers (inconsistência), cria
            await db.query('INSERT INTO trainers (user_id, is_approved) VALUES ($1, true)', [userId]);
        } else {
            // Atualiza
            await db.query('UPDATE trainers SET is_approved = true WHERE user_id = $1', [userId]);
        }
        
        req.flash('success', 'Treinador aprovado com sucesso!');
    } catch(err) {
        console.error("Erro na aprovação:", err);
        req.flash('error', 'Erro técnico ao aprovar.');
    }
    res.redirect(`/admin/users/${userId}`);
});

// Rotas auxiliares
router.get('/finance', (req, res) => res.render('pages/admin-finance', { revenue: { total: 0 } }));
router.get('/content', (req, res) => res.render('pages/admin-content'));
router.get('/settings', (req, res) => res.render('pages/admin-settings'));
router.get('/ia-audit', async (req, res) => {
    try { const logs = await db.query("SELECT * FROM ia_logs ORDER BY created_at DESC LIMIT 20"); res.render('pages/admin-ia-audit', { logs: logs.rows }); }
    catch(e) { res.render('pages/admin-ia-audit', { logs: [] }); }
});
router.get('/approvals', async (req, res) => {
    try {
        const result = await db.query("SELECT t.id, u.name FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.is_approved = false");
        res.render('pages/admin-approvals', { pendingTrainers: result.rows });
    } catch (e) { res.render('pages/admin-approvals', { pendingTrainers: [] }); }
});
router.post('/approve/:id', async (req, res) => {
    await db.query('UPDATE trainers SET is_approved = true WHERE id = $1', [req.params.id]);
    res.redirect('/admin/approvals');
});
router.get('/plans', async (req, res) => {
    try { const plans = await db.query("SELECT * FROM plans"); res.render('pages/admin-plans', { plans: plans.rows }); }
    catch(e) { res.render('pages/admin-plans', { plans: [] }); }
});

module.exports = router;
