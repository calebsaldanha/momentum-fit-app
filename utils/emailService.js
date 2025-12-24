const nodemailer = require('nodemailer');
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

const getBaseStyle = () => `
    font-family: 'Montserrat', sans-serif; 
    max-width: 600px; 
    margin: 0 auto; 
    padding: 30px; 
    background-color: #121212; 
    color: #e0e0e0;
    border-radius: 12px;
    border: 1px solid #333;
`;

// Função Genérica de Notificação
const sendEmail = async (to, subject, title, text, link, linkText) => {
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const fullLink = link ? `${protocol}://${host}${link}` : '#';

    const html = `
        <div style="${getBaseStyle()}">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #BEF202; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Momentum Fit</h2>
            </div>
            
            <h3 style="color: #ffffff; font-size: 20px; margin-bottom: 20px;">${title}</h3>
            <p style="color: #b0b0b0; line-height: 1.6; font-size: 16px; margin-bottom: 30px;">${text}</p>
            
            ${link ? `
            <div style="text-align: center; margin-bottom: 40px;">
                <a href="${fullLink}" style="background-color: #BEF202; color: #000000; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 800; text-transform: uppercase; display: inline-block;">
                    ${linkText || 'Acessar'}
                </a>
            </div>
            ` : ''}
            
            <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
            <p style="font-size: 12px; color: #666; text-align: center;">
                Você recebeu este e-mail porque tem uma conta na Momentum Fit.<br>
                © ${new Date().getFullYear()} Momentum Fit.
            </p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Momentum Fit" <${process.env.EMAIL_USER}>`,
            to, subject, html
        });
        console.log(`[EmailService] Enviado para ${to}: ${subject}`);
        return true;
    } catch (error) {
        console.error('[EmailService] Erro:', error);
        return false;
    }
};

// Função de Recuperação de Senha (Mantida)
const sendPasswordResetEmail = async (email, resetToken, host) => {
    const resetUrl = `https://${host}/auth/reset-password/${resetToken}`;
    const html = `
        <div style="${getBaseStyle()}">
            <h2 style="color: #BEF202; text-align: center;">Recuperar Senha</h2>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #BEF202; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Agora</a>
            </div>
            <p style="font-size: 12px; color: #666;">Link válido por 1 hora.</p>
        </div>
    `;
    
    try {
        await transporter.sendMail({
            from: `"Momentum Fit" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Recuperação de Senha',
            html
        });
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

module.exports = { sendEmail, sendPasswordResetEmail };
