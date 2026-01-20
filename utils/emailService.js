const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendEmail(to, subject, html) {
    if (!to || !process.env.SMTP_USER) {
        console.log(`[MOCK EMAIL] Para: ${to} | Assunto: ${subject}`);
        return;
    }
    try {
        await transporter.sendMail({ from: '"Momentum Fit" <no-reply@momentumfit.com>', to, subject, html });
        console.log(`[EMAIL ENVIADO] Para: ${to}`);
    } catch (err) {
        console.error("Erro envio email:", err.message);
    }
}

module.exports = { sendEmail };
