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

// --- DASHBOARD ---
router.get('/dashboard', async (req, res) => {
    try {
        const totalUsers = await db.query('SELECT COUNT(*) FROM users');
        const pending = await db.query('SELECT COUNT(*) FROM trainers WHERE is_approved = false');
        const activePlans = await db.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'");
        
        res.render('pages/admin-dashboard', { 
            stats: { 
                totalUsers: totalUsers.rows[0].count, 
                pendingApprovals: pending.rows[0].count,
                activePlans: activePlans.rows[0].count
            } 
        });
    } catch (err) {
        res.render('pages/admin-dashboard', { stats: { totalUsers: 0, pendingApprovals: 0, activePlans: 0 } });
    }
});

// --- CLIENTES LISTA ---
router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC");
        res.render('pages/admin-clients', { users: result.rows });
    } catch (err) {
        res.render('pages/admin-clients', { users: [], messages: { error: 'Erro ao carregar lista.' } });
    }
});

// --- DETALHES DO USUÁRIO (A LÓGICA PESADA DO BI) ---
router.get('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 1. Dados Básicos
        const userRes = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
        if (userRes.rows.length === 0) return res.redirect('/admin/users');
        const targetUser = userRes.rows[0];

        let data = { targetUser, details: {}, bi: {}, history: [] };

        // 2. Lógica para ALUNOS
        if (targetUser.role === 'client') {
            // Perfil Completo (Anamnese)
            const clientRes = await db.query("SELECT * FROM clients WHERE user_id = $1", [userId]);
            data.details = clientRes.rows[0] || {};
            
            // Buscar Treinador Responsável (Se houver)
            if (targetUser.trainer_id) {
                const trainerRes = await db.query("SELECT name FROM users WHERE id = $1", [targetUser.trainer_id]);
                data.details.trainerName = trainerRes.rows[0]?.name;
            }

            // Lista de todos treinadores (para o select de troca)
            const allTrainers = await db.query("SELECT u.id, u.name FROM users u JOIN trainers t ON u.id = t.user_id WHERE u.role = 'trainer' AND t.is_approved = true");
            data.allTrainers = allTrainers.rows;

            // Plano Ativo e Histórico
            const activePlan = await db.query("SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1", [userId]);
            data.activePlan = activePlan.rows[0];
            const planHistory = await db.query("SELECT * FROM payments WHERE user_id = $1 ORDER BY payment_date DESC", [userId]);
            data.financialHistory = planHistory.rows;

            // BI / Dashboard de Treino
            const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [userId]);
            data.workouts = workouts.rows; // Lista de treinos
            const completedCount = 0; // Mock (ou buscar de tabela de logs futura)
            data.bi = {
                totalWorkouts: workouts.rows.length,
                completedWorkouts: completedCount,
                attendanceRate: 85 // Mock %
            };

        // 3. Lógica para TREINADORES
        } else if (targetUser.role === 'trainer') {
            // Perfil Profissional
            const trainerRes = await db.query("SELECT * FROM trainers WHERE user_id = $1", [userId]);
            data.details = trainerRes.rows[0] || {};

            // KPIs Financeiros e de Alunos
            const students = await db.query("SELECT COUNT(*) FROM users WHERE trainer_id = $1", [userId]);
            const revenue = await db.query("SELECT SUM(amount) as total FROM payments WHERE trainer_id = $1", [data.details.id]); // Assumindo link payments->trainer
            
            data.bi = {
                activeStudents: students.rows[0].count,
                totalRevenue: revenue.rows[0].total || 0,
                pendingRevenue: 0 // Mock
            };

            // Histórico Financeiro
            data.financialHistory = []; // Buscaria da tabela payments filtrando pelo trainer_id
        }

        res.render('pages/admin-user-details', data);

    } catch (err) {
        console.error("Erro Admin Details:", err);
        req.flash('error', 'Erro ao carregar detalhes.');
        res.redirect('/admin/users');
    }
});

// --- AÇÕES DO ADMIN ---

// 1. Alternar Status (Suspender/Ativar)
router.post('/users/:id/toggle-status', async (req, res) => {
    await db.query("UPDATE users SET active = NOT active WHERE id = $1", [req.params.id]);
    req.flash('success', 'Status atualizado.');
    res.redirect(`/admin/users/${req.params.id}`);
});

// 2. Excluir Usuário (Soft Delete ou Hard Delete - Aqui faremos Hard com Cascade via DB idealmente, mas faremos logico por seguranca)
// Para MVP, vamos fazer Hard Delete das tabelas dependentes manual
router.post('/users/:id/delete', async (req, res) => {
    const userId = req.params.id;
    try {
        await db.query('BEGIN');
        // Limpar dependencias (Ordem importa)
        await db.query("DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = $1)", [userId]);
        await db.query("DELETE FROM workouts WHERE user_id = $1", [userId]);
        await db.query("DELETE FROM clients WHERE user_id = $1", [userId]);
        await db.query("DELETE FROM trainers WHERE user_id = $1", [userId]);
        await db.query("DELETE FROM users WHERE id = $1", [userId]); // Tchau
        await db.query('COMMIT');
        req.flash('success', 'Usuário excluído permanentemente.');
        res.redirect('/admin/users');
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        req.flash('error', 'Erro ao excluir usuário.');
        res.redirect(`/admin/users/${userId}`);
    }
});

// 3. Definir Treinador (Para Alunos)
router.post('/users/:id/assign-trainer', async (req, res) => {
    const { trainer_id } = req.body;
    await db.query("UPDATE users SET trainer_id = $1 WHERE id = $2", [trainer_id === 'none' ? null : trainer_id, req.params.id]);
    req.flash('success', 'Treinador atualizado.');
    res.redirect(`/admin/users/${req.params.id}`);
});

// Outras rotas padrão...
router.get('/finance', (req, res) => res.render('pages/admin-finance', { revenue: { total: 0 } }));
router.get('/content', (req, res) => res.render('pages/admin-content'));
router.get('/settings', (req, res) => res.render('pages/admin-settings'));
router.get('/ia-audit', (req, res) => res.render('pages/admin-ia-audit', { logs: [] }));
router.get('/approvals', async (req, res) => {
    const result = await db.query("SELECT t.id, u.name FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.is_approved = false");
    res.render('pages/admin-approvals', { pendingTrainers: result.rows });
});
router.post('/approve/:id', async (req, res) => {
    await db.query('UPDATE trainers SET is_approved = true WHERE id = $1', [req.params.id]);
    res.redirect('/admin/approvals');
});
router.get('/plans', async (req, res) => {
    try {
        const plans = await db.query("SELECT * FROM plans");
        res.render('pages/admin-plans', { plans: plans.rows });
    } catch(e) { res.render('pages/admin-plans', { plans: [] }); }
});

module.exports = router;
