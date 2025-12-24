const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuração do Transporter (SMTP)
// Use variáveis de ambiente para segurança
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true para 465, false para outras portas
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

/**
 * Envia e-mail de recuperação de senha
 */
const sendPasswordResetEmail = async (email, resetToken, host) => {
    const resetUrl = `https://${host}/auth/reset-password/${resetToken}`;
    
    const mailOptions = {
        from: `"Momentum Fit" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Recuperação de Senha - Momentum Fit',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #2c3e50; text-align: center;">Recuperação de Senha</h2>
                <p>Olá,</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no Momentum Fit.</p>
                <p>Se você não fez essa solicitação, ignore este e-mail.</p>
                <p>Para criar uma nova senha, clique no botão abaixo (válido por 1 hora):</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Minha Senha</a>
                </div>
                <p style="font-size: 12px; color: #777;">Ou cole este link no navegador: ${resetUrl}</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`E-mail de recuperação enviado para: ${email}`);
        return true;
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        return false;
    }
};

module.exports = { sendPasswordResetEmail };
