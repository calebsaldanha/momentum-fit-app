const { pool } = require('../database/db');
const emailService = require('./emailService');

async function getAdmins() {
    const res = await pool.query("SELECT id, email, name FROM users WHERE role = 'superadmin' OR (role = 'trainer' AND status = 'active')");
    return res.rows;
}

async function createNotification(userId, title, message, type = 'info', link = null) {
    try {
        await pool.query(
            "INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)",
            [userId, title, message, type, link]
        );
    } catch (err) { console.error("Erro Notif DB:", err); }
}

const notificationService = {
    // 1. Novo Cliente (Para Admins)
    async notifyNewClient(clientName, clientId) {
        const admins = await getAdmins();
        for (const admin of admins) {
            await createNotification(admin.id, 'Novo Cliente Aguardando', `O cliente ${clientName} preencheu a avaliação e aguarda aprovação.`, 'warning', `/admin/clients/${clientId}`);
            emailService.sendEmail(admin.email, 'Novo Cliente Aguardando Avaliação', 'Ação Necessária', `O cliente ${clientName} completou o cadastro. Acesse para aprovar e definir o treinador.`, `/admin/clients/${clientId}`, 'Avaliar Cliente');
        }
    },

    // 2. Cliente Aprovado (Para Cliente)
    async notifyClientApproval(clientId, trainerName) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [clientId]);
        if (res.rows.length === 0) return;
        const client = res.rows[0];

        await createNotification(clientId, 'Cadastro Aprovado!', `Seu perfil foi aprovado! Seu treinador é ${trainerName}.`, 'success', '/client/dashboard');
        emailService.sendEmail(client.email, 'Bem-vindo à Momentum Fit', 'Cadastro Aprovado!', `Olá ${client.name}, seu perfil foi avaliado e aprovado! Seu treinador responsável será ${trainerName}. Acesse a plataforma para ver seus treinos e entrar em contato.`, '/client/dashboard', 'Acessar Plataforma');
    },

    // 3. Novo Treino
    async notifyNewWorkout(workoutTitle, clientId, workoutId) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [clientId]);
        if (res.rows.length === 0) return;
        const client = res.rows[0];
        await createNotification(clientId, 'Novo Treino Disponível', `Seu treino "${workoutTitle}" está pronto.`, 'success', `/workouts/${workoutId}`);
        emailService.sendEmail(client.email, 'Hora de Treinar!', 'Novo Treino Disponível', `Seu treinador adicionou o treino "${workoutTitle}".`, `/workouts/${workoutId}`, 'Ver Treino');
    },

    // 4. Atribuição (Para Treinador)
    async notifyTrainerAssignment(trainerId, clientName, clientId) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [trainerId]);
        if (res.rows.length === 0) return;
        const trainer = res.rows[0];
        await createNotification(trainerId, 'Novo Aluno Atribuído', `Você é o responsável por ${clientName}.`, 'info', `/admin/clients/${clientId}`);
        emailService.sendEmail(trainer.email, 'Novo Aluno', 'Você tem um novo aluno!', `O aluno ${clientName} foi vinculado a você. Crie o primeiro treino dele.`, `/admin/clients/${clientId}`, 'Ver Aluno');
    },

    // 5. Nova Mensagem
    async notifyNewMessage(senderName, receiverId) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [receiverId]);
        if (res.rows.length === 0) return;
        await createNotification(receiverId, 'Nova Mensagem', `${senderName} enviou uma mensagem.`, 'info', '/chat');
    },

    // 6. Novo Artigo
    async notifyNewArticle(articleTitle, articleId) {
        const users = await pool.query("SELECT id FROM users WHERE status = 'active'");
        for (const u of users.rows) {
            await createNotification(u.id, 'Novo Artigo', `Leia: ${articleTitle}`, 'info', `/articles/${articleId}`);
        }
    },
    
    // 7. Novo Treinador (Para SuperAdmin)
    async notifyNewTrainer(trainerName) {
        const admins = await pool.query("SELECT id, email FROM users WHERE role = 'superadmin'");
        for (const admin of admins.rows) {
            await createNotification(admin.id, 'Novo Treinador', `${trainerName} solicitou cadastro.`, 'warning', '/superadmin/manage');
        }
    }
};

module.exports = notificationService;
