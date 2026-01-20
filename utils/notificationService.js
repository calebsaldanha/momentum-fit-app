const db = require('../database/db');
const { sendEmail } = require('./emailService');
const templates = require('./emailTemplates');

const notificationService = {
    // Função Principal
    notify: async ({ userId, type, title, message, link, data }) => {
        try {
            // 1. Salvar Notificação Interna (Plataforma)
            if (userId === 'ADMIN_GROUP') {
                // Enviar para todos os admins
                const admins = await db.query("SELECT id, email FROM users WHERE role IN ('admin', 'superadmin')");
                for (let admin of admins.rows) {
                    await insertNotification(admin.id, title, message, link, 'info');
                    // Opcional: E-mail para admin
                    await handleEmail(admin.email, type, data);
                }
            } else if (userId === 'ALL_CLIENTS') {
                // CUIDADO: Em produção, usar filas (queues). Aqui faremos um loop simples para o MVP.
                const clients = await db.query("SELECT id, email, name FROM users WHERE role = 'client' AND status = 'active'");
                for (let client of clients.rows) {
                    await insertNotification(client.id, title, message, link, 'info');
                    await handleEmail(client.email, type, { ...data, name: client.name });
                }
            } else {
                // Usuário Específico
                await insertNotification(userId, title, message, link, type.includes('error') ? 'alert' : 'info');
                
                // Buscar email do usuário para envio
                const userRes = await db.query("SELECT email, name, role FROM users WHERE id = $1", [userId]);
                if (userRes.rows.length > 0) {
                    await handleEmail(userRes.rows[0].email, type, { ...data, name: userRes.rows[0].name, role: userRes.rows[0].role });
                }
            }
        } catch (e) {
            console.error("Erro no NotificationService:", e);
        }
    }
};

// Auxiliar: Insere no Banco
async function insertNotification(userId, title, message, link, type) {
    await db.query(
        "INSERT INTO notifications (user_id, title, message, link, type, is_read, created_at) VALUES ($1, $2, $3, $4, $5, false, NOW())",
        [userId, title, message, link, type]
    );
}

// Auxiliar: Seleciona Template e Envia Email
async function handleEmail(email, type, data) {
    let content = null;
    
    // Mapeamento de Tipos para Templates
    switch (type) {
        case 'welcome_pending': content = templates.welcome_pending(data.name); break;
        case 'welcome_active': content = templates.welcome_active(data.name); break;
        case 'account_approved': content = templates.account_approved(data.name, data.role); break;
        case 'account_rejected': content = templates.account_rejected(data.name); break;
        case 'new_user_admin': content = templates.new_user_admin(data.name, data.role); break;
        case 'payment_pending_admin': content = templates.payment_pending_admin(data.userName, data.planName); break;
        case 'payment_reminder': content = templates.payment_reminder(data.name); break;
        case 'trainer_assigned': content = templates.new_assignment(data.clientName, data.trainerName, true); break; // Para o Trainer
        case 'client_assigned': content = templates.new_assignment(data.clientName, data.trainerName, false); break; // Para o Cliente
        case 'workout_created': content = templates.workout_update(data.workoutTitle, 'Criado'); break;
        case 'workout_edited': content = templates.workout_update(data.workoutTitle, 'Editado'); break;
        case 'article_approved': content = templates.article_status(data.articleTitle, 'Aprovado'); break;
        case 'article_rejected': content = templates.article_status(data.articleTitle, 'Rejeitado'); break;
        case 'new_article_broadcast': content = templates.new_article_client(data.articleTitle); break;
        case 'profile_reminder': content = templates.profile_reminder(data.name); break;
        case 'ai_error': content = templates.ai_error(data.errorMsg); break;
    }

    if (content) {
        await sendEmail(email, content.subject, content.html);
    }
}

module.exports = notificationService;
