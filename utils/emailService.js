const nodemailer = require('nodemailer');
const { generateEmailTemplate } = require('./emailTemplates');
require('dotenv').config();

// Configuração do Transporte (Login no Gmail)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true para 465, false para outras portas
    auth: {
        user: process.env.EMAIL_USER, // AQUI VAI O GMAIL (@gmail.com)
        pass: process.env.EMAIL_PASS  // A SENHA DE APP
    },
    tls: {
        rejectUnauthorized: false // Ajuda em alguns ambientes de desenvolvimento
    }
});

// Verificação de Conexão ao Iniciar
transporter.verify(function (error, success) {
    if (error) {
        console.error('❌ [EmailService] Erro de conexão SMTP:', error);
    } else {
        console.log('✅ [EmailService] Servidor de e-mail pronto para envio via:', process.env.EMAIL_USER);
    }
});

/**
 * Envia e-mails transacionais formatados
 */
const sendEmail = async (to, type, role, data, link, linkText) => {
    const host = process.env.VERCEL_URL || 'localhost:3000';
    
    // Gera o conteúdo HTML e o Assunto
    const { subject, html } = generateEmailTemplate(type, role, data, link, linkText, host);

    // Definição do Remetente (Alias)
    // Se existir EMAIL_FROM no .env usa ele, senão usa o user padrão
    // Formato: "Nome da Empresa" <email@dominio.com>
    const fromAddress = process.env.EMAIL_FROM 
        ? `"Momentum Fit" <${process.env.EMAIL_FROM}>` 
        : `"Momentum Fit" <${process.env.EMAIL_USER}>`;

    try {
        const info = await transporter.sendMail({
            from: fromAddress, // O e-mail que o cliente vê
            to,
            subject,
            html,
            replyTo: fromAddress // Para onde a resposta vai
        });
        
        console.log(`[EmailService] Sucesso: E-mail enviado para ${to} (ID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`[EmailService] Falha crítica ao enviar para ${to}:`, error);
        return false;
    }
};

/**
 * Recuperação de Senha
 */
const sendPasswordResetEmail = async (email, resetToken, host) => {
    const resetUrl = `https://${host}/auth/reset-password/${resetToken}`;
    const { generateEmailTemplate } = require('./emailTemplates');
    
    const { html } = generateEmailTemplate(
        'custom', 
        'client',
        { text: 'Recebemos uma solicitação para redefinir sua senha. Se não foi você, ignore este e-mail.<br><br>O link expira em 1 hora.' },
        resetUrl,
        'Redefinir Senha',
        host
    );

    const fromAddress = process.env.EMAIL_FROM 
        ? `"Momentum Fit" <${process.env.EMAIL_FROM}>` 
        : `"Momentum Fit" <${process.env.EMAIL_USER}>`;

    try {
        await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject: 'Recuperação de Senha',
            html: html.replace('Nova Notificação', 'Recuperar Senha')
        });
        console.log(`[EmailService] Reset de senha enviado para ${email}`);
        return true;
    } catch (error) {
        console.error('[EmailService] Erro Reset Senha:', error);
        return false;
    }
};

module.exports = { sendEmail, sendPasswordResetEmail };
