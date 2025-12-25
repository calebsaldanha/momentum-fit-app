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
        await pool.query(
            "INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)",
            [userId, title, message, type, link]
        );
    } catch (err) { console.error("Erro Notif DB:", err); }
}

const notificationService = {
    async notifyNewClient(clientName, clientId) {
        try {
            // Tenta obter e-mail do cliente para o template (opcional)
            const clientRes = await pool.query("SELECT email FROM users WHERE id = $1", [clientId]);
            const clientEmail = clientRes.rows[0]?.email || '';

            const admins = await getSuperAdmins();
            for (const admin of admins) {
                await createNotification(admin.id, 'Novo Aluno', `${clientName} aguarda avaliação.`, 'warning', `/admin/clients/${clientId}`);
                // Envia E-mail
                await emailService.sendEmail(admin.email, 'pendingClient', 'admin', { name: clientName, email: clientEmail }, `/admin/clients/${clientId}`, 'Ver Perfil');
            }
        } catch (e) { console.error(e); }
    },

    async notifyNewTrainer(trainerName, trainerEmail) {
        try {
            const admins = await getSuperAdmins();
            for (const admin of admins) {
                await createNotification(admin.id, 'Novo Personal', `${trainerName} solicitou cadastro.`, 'warning', '/superadmin/manage');
                // Envia E-mail
                await emailService.sendEmail(admin.email, 'pendingTrainer', 'admin', { name: trainerName, email: trainerEmail || 'N/A' }, '/superadmin/manage', 'Aprovar');
            }
        } catch (e) { console.error(e); }
    },

    async notifyNewMessage(senderName, receiverId) {
        try {
            await createNotification(receiverId, 'Nova Mensagem', `${senderName} enviou uma mensagem.`, 'info', '/chat');
            
            const res = await pool.query("SELECT email, role FROM users WHERE id = $1", [receiverId]);
            if(res.rows.length > 0) {
                const { email, role } = res.rows[0];
                let type = 'newMessage';
                let data = {};
                
                if (role === 'admin' || role === 'superadmin') {
                    data = { name: senderName, subject: 'Nova Mensagem no Chat' };
                    await emailService.sendEmail(email, type, 'admin', data, '/chat', 'Ir para Chat');
                } else if (role === 'trainer') {
                    data = { clientName: senderName };
                    await emailService.sendEmail(email, type, 'trainer', data, '/chat', 'Responder');
                } else if (role === 'client') {
                    data = { trainerName: senderName };
                    await emailService.sendEmail(email, type, 'client', data, '/chat', 'Ler Mensagem');
                }
            }
        } catch (e) { console.error(e); }
    },

    async notifyTrainerAssignment(trainerId, clientName, clientId) {
        try {
            const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [trainerId]);
            if (res.rows.length > 0) {
                await createNotification(trainerId, 'Novo Aluno', `Você é o responsável por ${clientName}.`, 'info', `/admin/clients/${clientId}`);
                await emailService.sendEmail(res.rows[0].email, 'clientAssigned', 'trainer', { clientName }, `/admin/clients/${clientId}`, 'Ver Aluno');
            }
        } catch (e) { console.error(e); }
    },

    async notifyClientApproval(clientId, trainerName) {
        try {
            await createNotification(clientId, 'Cadastro Aprovado!', `Seu treinador é ${trainerName}.`, 'success', '/client/dashboard');
            const res = await pool.query("SELECT email FROM users WHERE id = $1", [clientId]);
            if (res.rows.length > 0) {
                await emailService.sendEmail(res.rows[0].email, 'registrationApproved', 'client', {}, '/client/dashboard', 'Acessar Painel');
            }
        } catch (e) { console.error(e); }
    },

    async notifyNewWorkout(workoutTitle, clientId, workoutId, trainerName) {
        try {
            // Notifica Aluno
            await createNotification(clientId, 'Novo Treino', `Treino "${workoutTitle}" disponível.`, 'success', `/workouts/${workoutId}`);
            const clientRes = await pool.query("SELECT email FROM users WHERE id = $1", [clientId]);
            if (clientRes.rows.length > 0) {
                await emailService.sendEmail(clientRes.rows[0].email, 'newWorkout', 'client', { workoutTitle }, `/workouts/${workoutId}`, 'Ver Treino');
            }
            
            // Notifica Admins
            const admins = await getSuperAdmins();
            for (const admin of admins) {
                await createNotification(admin.id, 'Novo Treino Criado', `${trainerName} criou "${workoutTitle}" para o aluno ID ${clientId}.`, 'info', `/admin/clients/${clientId}`);
                await emailService.sendEmail(admin.email, 'newWorkoutCreated', 'admin', { trainerName, workoutTitle }, `/admin/clients/${clientId}`, 'Ver Detalhes');
            }
        } catch (e) { console.error(e); }
    },

    async notifyWorkoutUpdate(workoutTitle, clientId, trainerName) {
        try {
            // Notifica Aluno
            await createNotification(clientId, 'Treino Atualizado', `Seu treino "${workoutTitle}" foi alterado.`, 'warning', '/client/workouts');
            const clientRes = await pool.query("SELECT email FROM users WHERE id = $1", [clientId]);
            if (clientRes.rows.length > 0) {
                await emailService.sendEmail(clientRes.rows[0].email, 'workoutEdited', 'client', { workoutTitle }, '/client/workouts', 'Ver Treinos');
            }

            // Admin (Apenas DB para não spamar)
            const admins = await getSuperAdmins();
            for (const admin of admins) {
                await createNotification(admin.id, 'Treino Modificado', `${trainerName} editou o treino "${workoutTitle}" do aluno ID ${clientId}.`, 'info', `/admin/clients/${clientId}`);
            }
        } catch (e) { console.error(e); }
    },

    async notifyNewArticle(articleTitle, articleId) {
        try {
            const clients = await getActiveClients();
            for (const c of clients) {
                await createNotification(c.id, 'Novo Artigo', `Leia: ${articleTitle}`, 'info', `/articles/${articleId}`);
                await emailService.sendEmail(c.email, 'newArticle', 'client', { articleTitle }, `/articles/${articleId}`, 'Ler Artigo');
            }
            
            const trainers = await getActiveTrainers();
            for (const t of trainers) {
                await createNotification(t.id, 'Novo Artigo', `Novo conteúdo: ${articleTitle}`, 'info', `/articles/${articleId}`);
                await emailService.sendEmail(t.email, 'newArticle', 'trainer', { articleTitle }, `/articles/${articleId}`, 'Ler Artigo');
            }
        } catch (e) { console.error(e); }
    },
    
    async notifyTrainerApproval(trainerId) {
        try {
            await createNotification(trainerId, 'Conta Aprovada', 'Acesse seu painel.', 'success', '/admin/dashboard');
            // Template específico de aprovação de personal não definido, mantendo apenas DB ou usar genérico se desejar.
        } catch (e) { console.error(e); }
    }
};

module.exports = notificationService;
