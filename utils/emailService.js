const nodemailer = require('nodemailer');
const templates = require('./emailTemplates');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, htmlContent) => {
    if (!to) return false;
    
    // Simulação se não houver credenciais (para não travar em dev)
    if (!process.env.EMAIL_USER) {
        console.log(`\n��� [SIMULAÇÃO DE EMAIL]`);
        console.log(`Para: ${to}`);
        console.log(`Assunto: ${subject}`);
        return true;
    }

    try {
        await transporter.sendMail({
            from: '"Momentum Fit" <no-reply@momentumfit.com>',
            to,
            subject,
            html: htmlContent
        });
        console.log(`✅ Email enviado para ${to}`);
        return true;
    } catch (error) {
        console.error("❌ Erro ao enviar email:", error);
        return false;
    }
};

module.exports = {
    sendPasswordResetEmail: async (email, token, host) => {
        const link = `http://${host}/auth/reset/${token}`;
        return sendEmail(email, 'Redefinição de Senha', templates.resetPassword(link));
    },

    sendPasswordChangedEmail: async (email, name) => {
        return sendEmail(email, 'Sua senha foi alterada', templates.passwordChanged(name));
    },

    sendAdminPasswordResetEmail: async (email, name, newPassword) => {
        return sendEmail(email, 'Nova Senha de Acesso', templates.adminPasswordReset(name, newPassword));
    },

    sendNewMessageEmail: async (email, senderName, messageText, host) => {
        const link = `http://${host}/chat`;
        return sendEmail(email, 'Você tem uma nova mensagem', templates.newMessage(senderName, messageText.substring(0, 50), link));
    },

    sendArticlePublishedEmail: async (emails, title, authorName, host) => {
        const link = `http://${host}/articles`;
        // Envia como lista de BCC ou individualmente (aqui simplificado para string separada por virgula)
        return sendEmail(emails, 'Novo Artigo Publicado!', templates.articlePublished(title, authorName, link));
    },

    sendNewArticlePendingEmail: async (adminEmail, title, authorName, host) => {
        const link = `http://${host}/articles/manage`;
        return sendEmail(adminEmail, 'Novo Artigo Pendente', templates.articlePending(title, authorName, link));
    },

    sendNewWorkoutEmail: async (email, workoutTitle, clientName, host) => {
        const link = `http://${host}/client/workouts`;
        return sendEmail(email, 'Novo Treino Adicionado', templates.newWorkout(workoutTitle, clientName, link));
    },

    sendNewUserEmail: async (adminEmail, name, email, role) => {
        return sendEmail(adminEmail, 'Novo Registro no Sistema', templates.newUser(name, email, role));
    }
};
