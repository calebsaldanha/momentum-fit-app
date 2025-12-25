const { pool } = require('../database/db');

module.exports = async (req, res, next) => {
    // Padrão: sem notificações
    res.locals.unreadCount = 0;
    res.locals.notifications = [];

    // Se utilizador logado, buscar dados reais
    if (req.session && req.session.user) {
        try {
            // Contagem de não lidas
            const countRes = await pool.query(
                "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false", 
                [req.session.user.id]
            );
            res.locals.unreadCount = parseInt(countRes.rows[0].count);

            // Lista das últimas 5 (lidas ou não)
            const listRes = await pool.query(
                "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5", 
                [req.session.user.id]
            );
            res.locals.notifications = listRes.rows;
        } catch (e) {
            console.error("Erro middleware notificações:", e);
        }
    }
    next();
};
