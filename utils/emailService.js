const nodemailer = require('nodemailer');
const { generateEmailTemplate } = require('./emailTemplates');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, type, role, data, link, linkText) => {
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const { subject, html } = generateEmailTemplate(type, role, data, link, linkText, host);

    try {
        await transporter.sendMail({
            from: `"Momentum Fit" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`[EmailService] Sucesso: ${type} enviado para ${to}`);
        return true;
    } catch (error) {
        console.error(`[EmailService] Falha ao enviar para ${to}:`, error);
        return false;
    }
};

const sendPasswordResetEmail = async (email, resetToken, host) => {
    const resetUrl = `https://${host}/auth/reset-password/${resetToken}`;
    const { generateEmailTemplate } = require('./emailTemplates');
    
    // Simula uma notificação de cliente para aproveitar o layout
    const { html } = generateEmailTemplate(
        'custom', 'client',
        { text: 'Recebemos uma solicitação para redefinir sua senha. Se não foi você, ignore este e-mail.<br><br>O link expira em 1 hora.' },
        resetUrl, 'Redefinir Senha', host
    );

    try {
        await transporter.sendMail({
            from: `"Momentum Fit" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Recuperação de Senha',
            html: html.replace('Nova Notificação', 'Recuperar Senha')
        });
        return true;
    } catch (error) {
        console.error('[EmailService] Erro Reset Senha:', error);
        return false;
    }
};

module.exports = { sendEmail, sendPasswordResetEmail };
