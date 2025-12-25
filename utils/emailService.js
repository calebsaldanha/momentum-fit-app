const nodemailer = require('nodemailer');
const { generateEmailTemplate } = require('./emailTemplates');
const path = require('path');
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

const getHost = () => {
    if (process.env.APP_URL) return process.env.APP_URL;
    if (process.env.VERCEL_URL) return process.env.VERCEL_URL;
    return 'localhost:3000';
};

// Função auxiliar para obter anexos padrão (Logo)
const getCommonAttachments = () => {
    try {
        return [{
            filename: 'momentum-fit-logo-completo.png',
            // Caminho absoluto para a imagem na pasta public
            path: path.join(process.cwd(), 'public', 'images', 'momentum-fit-logo-completo.png'),
            cid: 'logo@momentumfit' // ID referenciado no template HTML
        }];
    } catch (e) {
        console.warn("[EmailService] Aviso: Logo não encontrada para anexo.", e.message);
        return [];
    }
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
            replyTo: fromAddress,
            attachments: getCommonAttachments() // Anexa a logo
        });
        console.log(`[EmailService] Enviado para ${to} (ID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`[EmailService] Erro ao enviar para ${to}:`, error);
        return false;
    }
};

const sendPasswordResetEmail = async (email, resetToken, host) => {
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
            html,
            attachments: getCommonAttachments() // Anexa a logo
        });
        return true;
    } catch (error) {
        console.error('[EmailService] Erro Reset:', error);
        return false;
    }
};

module.exports = { sendEmail, sendPasswordResetEmail };
