const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuração do Transporter (Gmail, Outlook, etc ou Mailtrap)
// Se não houver variáveis, ele vai apenas logar no console
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendPasswordResetEmail(email, token, host) {
    const resetLink = `http://${host}/auth/reset/${token}`;
    
    const mailOptions = {
        from: '"Momentum Fit" <no-reply@momentumfit.com>',
        to: email,
        subject: 'Redefinição de Senha - Momentum Fit',
        html: `
            <h3>Você solicitou a redefinição de senha?</h3>
            <p>Clique no link abaixo para criar uma nova senha:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>Se você não solicitou isso, ignore este e-mail.</p>
        `
    };

    if (!process.env.EMAIL_USER) {
        console.log("⚠️  EMAIL_USER não configurado. Simulando envio:");
        console.log(`��� Para: ${email}`);
        console.log(`��� Link: ${resetLink}`);
        return true;
    }

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email enviado para ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Erro ao enviar email:", error);
        return false;
    }
}

module.exports = { sendPasswordResetEmail };
