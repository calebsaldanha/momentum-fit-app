const { pool } = require('../database/db');

module.exports = async (req, res, next) => {
    // Inicializa variáveis para evitar erros nas views
    res.locals.unreadCount = 0;
    res.locals.notifications = [];

    if (req.session && req.session.user) {
        try {
            // 1. Contagem de não lidas (Badge vermelho)
            const countRes = await pool.query(
                "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false", 
                [req.session.user.id]
            );
            res.locals.unreadCount = parseInt(countRes.rows[0].count);

            // 2. Lista para o Dropdown (Apenas NÃO LIDAS)
            // Isso resolve o problema de "reaparecerem" após ler.
            // Se quiser ver as lidas, o usuário clica em "Ver todas".
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
