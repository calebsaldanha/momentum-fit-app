const nodemailer = require('nodemailer');
const { 
    welcomeClientTemplate, 
    newClientNotificationTemplate, 
    newWorkoutTemplate, 
    newMessageTemplate, 
    resetPasswordTemplate 
} = require('./emailTemplates');
require('dotenv').config();

// Configuração do Transporter (Gmail, Outlook, etc ou Ethereal para teste)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Ou outro serviço SMTP definido no .env
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Wrapper genérico de envio
async function sendEmail(to, subject, htmlContent) {
    if (!process.env.EMAIL_USER) {
        console.log('⚠️  Email não configurado no .env (EMAIL_USER). Simulação de envio:', subject);
        return;
    }
    try {
        await transporter.sendMail({
            from: `"Momentum Fit" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent
        });
        console.log(`��� Email enviado para ${to}: ${subject}`);
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
    }
}

// 1. Email de Boas-vindas para o Cliente
async function sendWelcomeEmail(email, name, host) {
    const profileLink = `https://${host}/client/profile`; // Link direto para o perfil/questionário
    const html = welcomeClientTemplate(name, profileLink);
    await sendEmail(email, 'Bem-vindo ao Momentum Fit! ���', html);
}

// 2. Notificação para o Treinador/Admin
async function sendNewClientNotification(clientName, clientEmail) {
    // Tenta enviar para o email admin definido no .env ou para o próprio email de envio como fallback
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if(adminEmail) {
        const html = newClientNotificationTemplate(clientName, clientEmail);
        await sendEmail(adminEmail, '�� Novo Aluno Cadastrado', html);
    }
}

// 3. Notificação de Novo Treino
async function sendNewWorkoutEmail(email, workoutTitle, userName, host) {
    const link = `https://${host}/client/workouts`;
    const html = newWorkoutTemplate(userName, workoutTitle, link);
    await sendEmail(email, 'Novo Treino Liberado! ���', html);
}

// 4. Notificação de Mensagem
async function sendNewMessageEmail(email, senderName, contentPreview, host) {
    const link = `https://${host}/chat`;
    const html = newMessageTemplate(senderName, contentPreview, link);
    await sendEmail(email, `Nova mensagem de ${senderName}`, html);
}

// 5. Recuperação de Senha (Admin)
async function sendAdminPasswordResetEmail(email, name, newPassword) {
    const html = `<p>Olá ${name}, sua senha foi alterada pelo administrador.</p><p>Nova senha: <strong>${newPassword}</strong></p>`;
    await sendEmail(email, 'Sua senha foi alterada', html);
}

// 6. Token de Recuperação
async function sendPasswordResetEmail(email, token, host) {
    const link = `https://${host}/auth/reset-password/${token}`;
    const html = resetPasswordTemplate(link);
    await sendEmail(email, 'Redefinição de Senha', html);
}

// Email simples para novo usuário criado pelo admin
async function sendNewUserEmail(adminEmail, name, email, role) {
    const html = `<p>O usuário ${name} (${email}) foi criado como ${role}.</p>`;
    await sendEmail(adminEmail, 'Novo Usuário Criado', html);
}

module.exports = {
    sendWelcomeEmail,
    sendNewClientNotification,
    sendNewWorkoutEmail,
    sendNewMessageEmail,
    sendAdminPasswordResetEmail,
    sendPasswordResetEmail,
    sendNewUserEmail
};
