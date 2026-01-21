const db = require('../database/db');
// Importação circular evitada requerendo apenas onde necessário ou usando injeção se fosse complexo.
// Assumindo que emailService já existe
const emailService = require('./emailService');

const createNotification = async (userId, title, message, link = '#', type = 'info') => {
    try {
        // userId NULL significa notificação para TODOS os Admins
        if (!userId) {
            const admins = await db.query("SELECT id, email FROM users WHERE role IN ('admin', 'superadmin')");
            for (const admin of admins.rows) {
                await db.query(
                    `INSERT INTO notifications (user_id, title, message, link, type, is_read, created_at)
                     VALUES ($1, $2, $3, $4, $5, false, NOW())`,
                    [admin.id, title, message, link, type]
                );
                
                // Dispara Email para Admin também (Opcional, mas recomendado para alertas críticos)
                if (type === 'alert') {
                     // emailService.sendEmail(admin.email, `Admin Alerta: ${title}`, message);
                }
            }
        } else {
            await db.query(
                `INSERT INTO notifications (user_id, title, message, link, type, is_read, created_at)
                 VALUES ($1, $2, $3, $4, $5, false, NOW())`,
                [userId, title, message, link, type]
            );
            
            // Lógica de espelhamento por email para o usuário
            // Busca email do user para enviar cópia
            const u = await db.query('SELECT email, name FROM users WHERE id = $1', [userId]);
            if(u.rows.length > 0) {
                 // Tenta enviar email, mas não quebra se falhar
                 try {
                     // emailService.sendEmail(u.rows[0].email, `Nova Notificação: ${title}`, message);
                 } catch(err) { console.error("Erro enviando email espelho:", err); }
            }
        }
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
    }
};

const getNotifications = async (userId) => {
    try {
        const result = await db.query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [userId]
        );
        return result.rows;
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        return [];
    }
};

const markAsRead = async (notificationId) => {
    try {
        await db.query('UPDATE notifications SET is_read = true WHERE id = $1', [notificationId]);
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
    }
};

module.exports = {
    createNotification,
    getNotifications,
    markAsRead
};
