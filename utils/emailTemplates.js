const styles = {
    bgBody: '#050505',
    bgCard: '#121212',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    accent: '#BEF202',
    border: '#2A2A2A',
    fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    containerWidth: '600px',
    borderRadius: '16px',
};

const getBaseLayout = (preheader, title, content, host) => {
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Background da Página Inicial (Hero BG)
    // Nota: Em localhost, usamos um placeholder para evitar erros de carregamento
    const bgUrl = host.includes('localhost')
        ? 'https://placehold.co/800x1000/050505/050505.png' 
        : `${baseUrl}/images/hero-bg.png`;

    // Logo via CID (Anexo) para garantir exibição
    const logoSrc = 'cid:logo@momentumfit';

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { margin: 0; padding: 0; background-color: ${styles.bgBody}; font-family: ${styles.fontFamily}; -webkit-font-smoothing: antialiased; }
            a { color: ${styles.accent}; text-decoration: none; }
            img { display: block; border: 0; max-width: 100%; height: auto; }
            .bg-image {
                background-image: url('${bgUrl}');
                background-size: cover;
                background-position: center top;
                background-repeat: no-repeat;
                background-color: ${styles.bgBody};
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${styles.bgBody};">
        <div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>

        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="bg-image" style="padding: 60px 0;">
            <tr>
                <td align="center">
                    
                    <table border="0" cellpadding="0" cellspacing="0" width="${styles.containerWidth}" style="background-color: rgba(18, 18, 18, 0.96); border-radius: ${styles.borderRadius}; border: 1px solid ${styles.border}; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.8); backdrop-filter: blur(5px);">
                        
                        <tr>
                            <td align="center" style="padding: 40px 0; border-bottom: 1px solid ${styles.border}; background: linear-gradient(to bottom, rgba(30,30,30,0.5), rgba(18,18,18,0));">
                                <a href="${baseUrl}" target="_blank">
                                    <img src="${logoSrc}" alt="Momentum Fit" width="180" style="color: #fff;">
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 50px; color: ${styles.textPrimary};">
                                <h1 style="margin: 0 0 25px 0; font-size: 24px; font-weight: 800; text-transform: uppercase; text-align: center; letter-spacing: -0.5px;">
                                    ${title}
                                </h1>
                                <div style="font-size: 16px; line-height: 1.7; color: ${styles.textSecondary}; text-align: left;">
                                    ${content}
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td style="background-color: #080808; padding: 30px; text-align: center; border-top: 1px solid ${styles.border};">
                                <p style="margin: 0; font-size: 11px; color: #555;">
                                    © ${new Date().getFullYear()} Momentum Fit. Todos os direitos reservados.
                                </p>
                            </td>
                        </tr>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0"><tr><td height="40"></td></tr></table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

const createButton = (link, text) => `
    <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 35px; margin-bottom: 15px; width: 100%;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" bgcolor="${styles.accent}" style="border-radius: 8px;">
                            <a href="${link}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: ${styles.fontFamily}; font-size: 14px; font-weight: 800; color: #000000; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
                                ${text}
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
`;

const highlight = (text) => `<span style="color: ${styles.textPrimary}; font-weight: 700;">${text}</span>`;
const accent = (text) => `<span style="color: ${styles.accent}; font-weight: 700;">${text}</span>`;

const templates = {
    pendingTrainer: (data) => ({ title: 'Solicitação de Personal', text: `Um novo personal trainer, ${highlight(data.name)} (<a href="mailto:${data.email}" style="color:${styles.accent}">${data.email}</a>), realizou o cadastro.` }),
    pendingClient: (data) => ({ title: 'Novo Cliente', text: `O cliente ${highlight(data.name)} completou o cadastro e aguarda vinculação.` }),
    newMessageAdmin: (data) => ({ title: 'Nova Mensagem', text: `O usuário ${highlight(data.name)} enviou uma mensagem:<br><br><em>"${data.subject}"</em>` }),
    newMessageTrainer: (data) => ({ title: 'Nova Mensagem', text: `Seu aluno ${highlight(data.clientName)} enviou uma mensagem no chat.` }),
    clientAssigned: (data) => ({ title: 'Novo Aluno', text: `Você recebeu um novo aluno! ${highlight(data.clientName)} foi adicionado à sua lista.` }),
    newMessageClient: (data) => ({ title: 'Mensagem do Personal', text: `${highlight(data.trainerName)} respondeu sua mensagem no chat.` }),
    registrationApproved: () => ({ title: 'Bem-vindo(a)!', text: `Sua conta na Momentum Fit foi aprovada.` }),
    newWorkout: (data) => ({ title: 'Novo Treino', text: `Um novo treino foi adicionado à sua rotina: <br><br>${accent(data.workoutTitle)}` }),
    newWorkoutCreated: (data) => ({ title: 'Treino Criado', text: `Personal ${highlight(data.trainerName)} criou o treino "${accent(data.workoutTitle)}".` }),
    workoutEdited: (data) => ({ title: 'Treino Atualizado', text: `Seu personal fez ajustes no treino ${highlight(data.workoutTitle)}.` }),
    newArticle: (data) => ({ title: 'Novo Artigo', text: `Um novo artigo foi publicado: ${highlight(data.articleTitle)}.` }),
    custom: (data) => ({ title: 'Notificação', text: data.text })
};

const generateEmailTemplate = (type, role, data, link, linkText, host) => {
    let templateKey = type;
    if (type === 'newMessage') {
        if (role === 'admin') templateKey = 'newMessageAdmin';
        else if (role === 'trainer') templateKey = 'newMessageTrainer';
        else templateKey = 'newMessageClient';
    }
    const templateFn = templates[templateKey] || templates.custom;
    const { title, text } = templateFn(data);
    
    let bodyContent = text;
    let fullLink = '#';
    if (link) {
        fullLink = link.startsWith('http') ? link : (host.startsWith('http') ? `${host}${link}` : `https://${host}${link}`);
        bodyContent += createButton(fullLink, linkText || 'Acessar');
    }
    return { subject: title, html: getBaseLayout(title, title, bodyContent, host) };
};

module.exports = { generateEmailTemplate };
