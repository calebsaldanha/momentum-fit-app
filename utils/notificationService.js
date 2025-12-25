const { pool } = require('../database/db');
const emailService = require('./emailService');

async function getSuperAdmins() {
    try {
        const res = await pool.query("SELECT id, email, name FROM users WHERE role = 'superadmin'");
        return res.rows;
    } catch (e) { return []; }
}

async function getActiveTrainers() {
    try {
        const res = await pool.query("SELECT id, email, name FROM users WHERE role = 'trainer' AND status = 'active'");
        return res.rows;
    } catch (e) { return []; }
}

async function getActiveClients() {
    try {
        const res = await pool.query("SELECT id, email, name FROM users WHERE role = 'client' AND status = 'active'");
        return res.rows;
    } catch (e) { return []; }
}

async function createNotification(userId, title, message, type = 'info', link = null) {
    try {
        // Evitar duplicatas exatas em curto período (opcional, mas bom pra chat)
        await pool.query(
            "INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)",
            [userId, title, message, type, link]
        );
    } catch (err) { console.error("Erro Notif DB:", err); }
}

const notificationService = {
    // ADMIN: Novo Aluno Cadastrado
    async notifyNewClient(clientName, clientId) {
        try {
            const admins = await getSuperAdmins();
            for (const admin of admins) {
                await createNotification(admin.id, 'Novo Aluno', `${clientName} aguarda avaliação.`, 'warning', `/admin/clients/${clientId}`);
            }
        } catch (e) { console.error(e); }
    },

    // ADMIN: Novo Personal
    async notifyNewTrainer(trainerName) {
        try {
            const admins = await getSuperAdmins();
            for (const admin of admins) {
                await createNotification(admin.id, 'Novo Personal', `${trainerName} solicitou cadastro.`, 'warning', '/superadmin/manage');
            }
        } catch (e) { console.error(e); }
    },

    // CHAT: Nova Mensagem (Para todos os perfis)
    async notifyNewMessage(senderName, receiverId) {
        try {
            await createNotification(receiverId, 'Nova Mensagem', `${senderName} enviou uma mensagem.`, 'info', '/chat');
        } catch (e) { console.error(e); }
    },

    // PERSONAL: Novo Aluno Atribuído
    async notifyTrainerAssignment(trainerId, clientName, clientId) {
        try {
            const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [trainerId]);
            if (res.rows.length > 0) {
                await createNotification(trainerId, 'Novo Aluno', `Você é o responsável por ${clientName}.`, 'info', `/admin/clients/${clientId}`);
            }
        } catch (e) { console.error(e); }
    },

    // ALUNO: Aprovação de Perfil
    async notifyClientApproval(clientId, trainerName) {
        try {
            await createNotification(clientId, 'Cadastro Aprovado!', `Seu treinador é ${trainerName}.`, 'success', '/client/dashboard');
        } catch (e) { console.error(e); }
    },

    // TREINOS: Criação (Notifica Aluno e Admin)
    async notifyNewWorkout(workoutTitle, clientId, workoutId, trainerName) {
        try {
            // Notifica Aluno (Primeiro treino ou novo treino)
            await createNotification(clientId, 'Novo Treino', `Treino "${workoutTitle}" disponível.`, 'success', `/workouts/${workoutId}`);
            
            // Notifica Admins
            const admins = await getSuperAdmins();
            for (const admin of admins) {
                await createNotification(admin.id, 'Novo Treino Criado', `${trainerName} criou "${workoutTitle}" para o aluno ID ${clientId}.`, 'info', `/admin/clients/${clientId}`);
            }
        } catch (e) { console.error(e); }
    },

    // TREINOS: Modificação (Notifica Aluno e Admin)
    async notifyWorkoutUpdate(workoutTitle, clientId, trainerName) {
        try {
            // Notifica Aluno
            await createNotification(clientId, 'Treino Atualizado', `Seu treino "${workoutTitle}" foi alterado.`, 'warning', '/client/workouts');
            
            // Notifica Admins
            const admins = await getSuperAdmins();
            for (const admin of admins) {
                await createNotification(admin.id, 'Treino Modificado', `${trainerName} editou o treino "${workoutTitle}" do aluno ID ${clientId}.`, 'info', `/admin/clients/${clientId}`);
            }
        } catch (e) { console.error(e); }
    },

    // ARTIGOS (Blog)
    async notifyNewArticle(articleTitle, articleId) {
        try {
            const clients = await getActiveClients();
            for (const c of clients) await createNotification(c.id, 'Novo Artigo', `Leia: ${articleTitle}`, 'info', `/articles/${articleId}`);
            
            const trainers = await getActiveTrainers();
            for (const t of trainers) await createNotification(t.id, 'Novo Artigo', `Novo conteúdo: ${articleTitle}`, 'info', `/articles/${articleId}`);
        } catch (e) { console.error(e); }
    },
    
    // PERSONAL: Conta Aprovada
    async notifyTrainerApproval(trainerId) {
        try {
            await createNotification(trainerId, 'Conta Aprovada', 'Acesse seu painel.', 'success', '/admin/dashboard');
        } catch (e) { console.error(e); }
    }
};

module.exports = notificationService;
