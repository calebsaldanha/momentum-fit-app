const { pool } = require('../database/db');
const emailService = require('./emailService');

// Função auxiliar para buscar admins
async function getAdmins() {
    const res = await pool.query("SELECT id, email, name FROM users WHERE role = 'superadmin' OR (role = 'trainer' AND status = 'active')");
    return res.rows;
}

// Função genérica interna
async function createNotification(userId, title, message, type = 'info', link = null) {
    try {
        await pool.query(
            "INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)",
            [userId, title, message, type, link]
        );
    } catch (err) {
        console.error("Erro ao salvar notificação no DB:", err);
    }
}

const notificationService = {
    // 1. Novo Cliente (Para Admins)
    async notifyNewClient(clientName, clientId) {
        const admins = await getAdmins();
        for (const admin of admins) {
            await createNotification(admin.id, 'Novo Cliente Cadastrado', \`O cliente \${clientName} acabou de se cadastrar e aguarda atribuição.\`, 'alert', \`/admin/clients/\${clientId}\`);
            
            // Envia Email
            emailService.sendEmail(
                admin.email, 
                'Novo Cliente na Momentum Fit', 
                'Novo Cliente Cadastrado', 
                \`O cliente \${clientName} se cadastrou na plataforma. Acesse o painel para gerenciar.\`,
                \`/admin/clients/\${clientId}\`,
                'Ver Cliente'
            );
        }
    },

    // 2. Novo Treinador (Para Admins)
    async notifyNewTrainer(trainerName) {
        const admins = await pool.query("SELECT id, email FROM users WHERE role = 'superadmin'");
        for (const admin of admins.rows) {
            await createNotification(admin.id, 'Novo Treinador Pendente', \`O personal \${trainerName} solicitou cadastro.\`, 'warning', '/superadmin/manage');
            
            emailService.sendEmail(
                admin.email,
                'Aprovação Pendente: Novo Treinador',
                'Novo Treinador Registrado',
                \`\${trainerName} solicitou acesso como treinador. Revise o cadastro para aprovar.\`,
                '/superadmin/manage',
                'Gerenciar Acessos'
            );
        }
    },

    // 3. Novo Treino (Para Cliente)
    async notifyNewWorkout(workoutTitle, clientId, workoutId) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [clientId]);
        if (res.rows.length === 0) return;
        const client = res.rows[0];

        await createNotification(clientId, 'Novo Treino Disponível', \`Seu treino "\${workoutTitle}" já está disponível.\`, 'success', \`/workouts/\${workoutId}\`);

        emailService.sendEmail(
            client.email,
            'Hora de Treinar! Novo treino adicionado',
            'Novo Treino Disponível',
            \`Olá \${client.name}, seu personal acabou de adicionar o treino "\${workoutTitle}" à sua rotina.\`,
            \`/workouts/\${workoutId}\`,
            'Ver Treino'
        );
    },

    // 4. Atribuição de Cliente (Para Treinador)
    async notifyTrainerAssignment(trainerId, clientName, clientId) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [trainerId]);
        if (res.rows.length === 0) return;
        const trainer = res.rows[0];

        await createNotification(trainerId, 'Novo Aluno Atribuído', \`Você agora é responsável pelo aluno \${clientName}.\`, 'info', \`/admin/clients/\${clientId}\`);

        emailService.sendEmail(
            trainer.email,
            'Novo Aluno Atribuído',
            'Você tem um novo aluno!',
            \`O aluno \${clientName} foi vinculado à sua conta. Comece criando um plano de treino.\`,
            \`/admin/clients/\${clientId}\`,
            'Ver Perfil do Aluno'
        );
    },

    // 5. Novo Artigo (Para Todos: Clientes e Treinadores)
    async notifyNewArticle(articleTitle, articleId) {
        const users = await pool.query("SELECT id, email, name FROM users WHERE role IN ('client', 'trainer') AND status = 'active'");
        
        // Loop para criar notificações (pode ser otimizado com bulk insert no futuro)
        for (const user of users.rows) {
            await createNotification(user.id, 'Novo Artigo no Blog', \`Confira: \${articleTitle}\`, 'info', \`/articles/\${articleId}\`);
            
            // Email em massa (cuidado com limites do Gmail SMTP)
            // Para produção, usar filas (queues). Aqui faremos direto.
            emailService.sendEmail(
                user.email,
                \`Novo Artigo: \${articleTitle}\`,
                'Novidade no Blog Momentum Fit',
                \`Acabamos de publicar um novo conteúdo: "\${articleTitle}".\`,
                \`/articles/\${articleId}\`,
                'Ler Artigo'
            );
        }
    },

    // 6. Nova Mensagem Chat (Para Destinatário)
    async notifyNewMessage(senderName, receiverId) {
        const res = await pool.query("SELECT email, name FROM users WHERE id = $1", [receiverId]);
        if (res.rows.length === 0) return;
        const receiver = res.rows[0];

        await createNotification(receiverId, 'Nova Mensagem', \`\${senderName} enviou uma mensagem para você.\`, 'info', '/chat');

        // Opcional: Não enviar email para cada mensagem de chat para não fazer spam, 
        // ou enviar apenas se estiver offline (lógica complexa).
        // Por enquanto, enviaremos.
        emailService.sendEmail(
            receiver.email,
            \`Nova mensagem de \${senderName}\`,
            'Você recebeu uma mensagem',
            \`\${senderName} enviou uma nova mensagem no chat da plataforma.\`,
            '/chat',
            'Ir para o Chat'
        );
    }
};

module.exports = notificationService;
