const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

// Configuração do Transporter (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Template HTML Padronizado
const getHtmlTemplate = (title, message, actionLink = '', actionText = 'Acessar Plataforma') => {
    const year = new Date().getFullYear();
    const logoCid = 'logo-momentum-fit';
    
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background-color: #000000; padding: 20px; text-align: center; border-bottom: 3px solid #d4af37; }
            .header img { max-height: 50px; }
            .content { padding: 30px; color: #333333; line-height: 1.6; }
            .h1 { color: #d4af37; font-size: 24px; margin-bottom: 10px; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #d4af37; color: #000000; text-decoration: none; font-weight: bold; border-radius: 5px; margin-top: 20px; }
            .btn:hover { background-color: #b5952f; }
            .footer { background-color: #eeeeee; padding: 15px; text-align: center; font-size: 12px; color: #777777; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="cid:${logoCid}" alt="Momentum Fit" width="150" height="auto" style="max-width: 150px; height: auto;">
            </div>
            <div class="content">
                <h1 class="h1">${title}</h1>
                <p>${message.replace(/\n/g, '<br>')}</p>
                
                ${actionLink ? `<a href="${process.env.BASE_URL || 'http://localhost:3000'}${actionLink}" class="btn">${actionText}</a>` : ''}
            </div>
            <div class="footer">
                <p>&copy; ${year} Momentum Fit. Todos os direitos reservados.</p>
                <p>Este é um e-mail automático, por favor não responda.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

const sendEmail = async (to, subject, title, textMessage, link = null, linkText = null) => {
    try {
        if (!to) return;
        
        const htmlContent = getHtmlTemplate(title, textMessage, link, linkText);
        
        const mailOptions = {
            from: '"Momentum Fit" <admin@momentumfitness.com.br>',
            to: to,
            subject: subject,
            html: htmlContent,
            attachments: [{
                filename: 'momentum-fit-logo-completo.png',
                path: path.join(__dirname, '../public/images/momentum-fit-logo-completo.png'),
                cid: 'logo-momentum-fit' // Identificador único para a imagem no HTML
            }]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('��� E-mail enviado: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Erro ao enviar e-mail:', error);
    }
};

module.exports = { sendEmail };
