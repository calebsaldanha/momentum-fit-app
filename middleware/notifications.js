const { pool } = require('../database/db');

module.exports = async (req, res, next) => {
    res.locals.unreadCount = 0;
    res.locals.notifications = [];

    if (req.session && req.session.user) {
        try {
            // Contagem (apenas não lidas)
            const countRes = await pool.query(
                "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false", 
                [req.session.user.id]
            );
            res.locals.unreadCount = parseInt(countRes.rows[0].count);

            // Lista (APENAS NÃO LIDAS)
            // Alterado para garantir que mensagens lidas sumam do menu dropdown
            const listRes = await pool.query(
                "SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC LIMIT 10", 
                [req.session.user.id]
            );
            res.locals.notifications = listRes.rows;
        } catch (e) {
            console.error("Erro middleware notificações:", e);
        }
    }
    next();
};
