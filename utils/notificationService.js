const { pool } = require('../database/db');
const emailService = require('./emailService');

// Auxiliar: Busca todos os Admins (Superadmin)
async function getSuperAdmins() {
    const res = await pool.query("SELECT id, email, name FROM users WHERE role = 'superadmin'");
    return res.rows;
}

// Auxiliar: Busca Treinadores Ativos
async function getActiveTrainers() {
    const res = await pool.query("SELECT id, email, name FROM users WHERE role = 'trainer' AND status = 'active'");
    return res.rows;
}

// Auxiliar: Busca Clientes Ativos
async function getActiveClients() {
    const res = await pool.query("SELECT id, email, name FROM users WHERE role = 'client' AND status = 'active'");
    return res.rows;
}

// Cria notificação no banco
async function createNotification(userId, title, message, type = 'info', link = null) {
    try {
        await pool.query(
            "INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)",
            [userId, title, message, type, link]
        );
    } catch (err) { console.error("Erro Notif DB:", err); }
}

const notificationService = {
    // 1. ADMIN: Novo Cliente Cadastrado (Aguardando Avaliação)
    async notifyNewClient(clientName, clientId) {
        const admins = await getSuperAdmins();
        for (const admin of admins) {
            await createNotification(admin.id, 'Novo Cliente', `${clientName} aguarda avaliação.`, 'warning', `/admin/clients/${clientId}`);
            
            emailService.sendEmail(
                admin.email, 
                'Novo Cliente Aguardando', 
                'Novo Cadastro', 
                `O cliente ${clientName} preencheu a ficha de anamnese e aguarda aprovação/atribuição.`, 
                `/admin/clients/${clientId}`, 
                'Avaliar Cliente'
            );
        }
    },

    // 2. ADMIN: Novo Personal Cadastrado
    async notifyNewTrainer(trainerName) {
        const admins = await getSuperAdmins();
        for (const admin of admins) {
            await createNotification(admin.id, 'Novo Personal', `${trainerName} solicitou cadastro.`, 'warning', '/superadmin/manage');
            
            emailService.sendEmail(
                admin.email, 
                'Novo Personal Pendente', 
                'Ação Necessária', 
                `${trainerName} se cadastrou como personal e aguarda aprovação.`, 
                '/superadmin/manage', 
                'Gerenciar'
            );
        }
    },

    // 3. ADMIN/PERSONAL/CLIENTE: Nova Mensagem
    async notifyNewMessage(senderName, receiverId) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [receiverId]);
        if (res.rows.length === 0) return;
        const receiver = res.rows[0];
        
        await createNotification(receiverId, 'Nova Mensagem', `${senderName} enviou uma mensagem.`, 'info', '/chat');
    },

    // 4. PERSONAL: Novo Cliente Atribuído
    async notifyTrainerAssignment(trainerId, clientName, clientId) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [trainerId]);
        if (res.rows.length === 0) return;
        const trainer = res.rows[0];

        await createNotification(trainerId, 'Novo Aluno', `Você é o responsável por ${clientName}.`, 'info', `/admin/clients/${clientId}`);
        
        emailService.sendEmail(
            trainer.email, 
            'Novo Aluno Atribuído', 
            'Você tem um novo aluno!', 
            `O aluno ${clientName} foi vinculado a você.`, 
            `/admin/clients/${clientId}`, 
            'Ver Aluno'
        );
    },

    // 5. CLIENTE: Aprovação de Cadastro
    async notifyClientApproval(clientId, trainerName) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [clientId]);
        if (res.rows.length === 0) return;
        const client = res.rows[0];

        await createNotification(clientId, 'Cadastro Aprovado!', `Bem-vindo! Seu treinador é ${trainerName}.`, 'success', '/client/dashboard');
        
        emailService.sendEmail(
            client.email, 
            'Bem-vindo à Momentum Fit', 
            'Cadastro Aprovado!', 
            `Seu perfil foi aprovado e seu treinador é ${trainerName}. Acesse para ver seus treinos.`, 
            '/client/dashboard', 
            'Acessar Plataforma'
        );
    },

    // 6. CLIENTE: Treino Criado (Todo novo treino)
    async notifyNewWorkout(workoutTitle, clientId, workoutId) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [clientId]);
        if (res.rows.length === 0) return;
        const client = res.rows[0];

        await createNotification(clientId, 'Novo Treino', `Treino "${workoutTitle}" disponível.`, 'success', `/workouts/${workoutId}`);
        
        emailService.sendEmail(
            client.email, 
            'Hora de Treinar!', 
            'Novo Treino', 
            `Seu treinador criou o treino "${workoutTitle}".`, 
            `/workouts/${workoutId}`, 
            'Ver Treino'
        );
    },

    // 7. PERSONAL/CLIENTE: Novos Artigos
    async notifyNewArticle(articleTitle, articleId) {
        // Notificar Clientes
        const clients = await getActiveClients();
        for (const c of clients) {
            await createNotification(c.id, 'Novo Artigo', `Leia: ${articleTitle}`, 'info', `/articles/${articleId}`);
        }
        
        // Notificar Personais
        const trainers = await getActiveTrainers();
        for (const t of trainers) {
            await createNotification(t.id, 'Novo Artigo', `Novo conteúdo publicado: ${articleTitle}`, 'info', `/articles/${articleId}`);
        }
    },
    
    // 8. PERSONAL: Conta Aprovada
    async notifyTrainerApproval(trainerId) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [trainerId]);
        if (res.rows.length === 0) return;
        const trainer = res.rows[0];
        
        await createNotification(trainerId, 'Conta Aprovada', 'Você já pode acessar o painel.', 'success', '/admin/dashboard');
        
        emailService.sendEmail(
            trainer.email, 
            'Conta Aprovada', 
            'Bem-vindo!', 
            'Sua conta de personal foi aprovada.', 
            '/admin/dashboard', 
            'Acessar Painel'
        );
    }
};

module.exports = notificationService;
