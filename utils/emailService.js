const nodemailer = require('nodemailer');
const { generateEmailTemplate } = require('./emailTemplates');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
});

// Helper para descobrir o HOST correto (Produção vs Local)
const getHost = () => {
    // Se tiver definido no .env (ideal para produção)
    if (process.env.APP_URL) return process.env.APP_URL;
    if (process.env.VERCEL_URL) return process.env.VERCEL_URL;
    // Fallback para desenvolvimento local
    return 'localhost:3000';
};

const sendEmail = async (to, type, role, data, link, linkText) => {
    const host = getHost();
    const { subject, html } = generateEmailTemplate(type, role, data, link, linkText, host);

    const fromAddress = process.env.EMAIL_FROM 
        ? `"Momentum Fit" <${process.env.EMAIL_FROM}>` 
        : `"Momentum Fit" <${process.env.EMAIL_USER}>`;

    try {
        const info = await transporter.sendMail({
            from: fromAddress,
            to, subject, html,
            replyTo: fromAddress
        });
        console.log(`[EmailService] Enviado para ${to} (ID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`[EmailService] Erro ao enviar para ${to}:`, error);
        return false;
    }
};

const sendPasswordResetEmail = async (email, resetToken, host) => {
    // Usamos o template 'custom' para manter o design consistente
    const resetUrl = `https://${host}/auth/reset-password/${resetToken}`;
    const { subject, html } = generateEmailTemplate(
        'custom', 'client',
        { text: 'Recebemos uma solicitação para redefinir sua senha. Se não foi você, ignore este e-mail.<br>O link expira em 1 hora.' },
        `/auth/reset-password/${resetToken}`,
        'Redefinir Senha',
        host
    );

    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;

    try {
        await transporter.sendMail({
            from: `"Momentum Fit" <${fromAddress}>`,
            to: email, 
            subject: 'Recuperação de Senha', 
            html
        });
        return true;
    } catch (error) {
        console.error('[EmailService] Erro Reset:', error);
        return false;
    }
};

module.exports = { sendEmail, sendPasswordResetEmail };
