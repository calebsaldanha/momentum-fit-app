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
    // Definição de Protocolo e Host
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // --- IMAGENS DA PLATAFORMA ---
    // Usamos caminhos absolutos baseados no host da aplicação
    
    // Logo Principal
    const logoUrl = host.includes('localhost') 
        ? 'https://placehold.co/400x100/121212/BEF202?text=MOMENTUM+FIT' // Fallback local
        : `${baseUrl}/images/momentum-fit-logo-completo.png`;

    // Imagem de Fundo (Background Geral)
    // Usamos a 'auth-bg.png' ou 'hero-bg.png' para dar textura
    const bgUrl = host.includes('localhost')
        ? 'https://placehold.co/800x1000/050505/111111?text=' 
        : `${baseUrl}/images/auth-bg.png`;

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            body { margin: 0; padding: 0; background-color: ${styles.bgBody}; -webkit-font-smoothing: antialiased; }
            a { color: ${styles.accent}; text-decoration: none; }
            img { display: block; border: 0; max-width: 100%; height: auto; }
            
            /* Background Image Support */
            .bg-image {
                background-image: url('${bgUrl}');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                background-color: ${styles.bgBody}; /* Fallback color */
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${styles.bgBody}; font-family: ${styles.fontFamily};">
        
        <div style="display: none; max-height: 0px; overflow: hidden;">
            ${preheader}
            &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        </div>

        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="bg-image" style="background-image: url('${bgUrl}'); background-color: ${styles.bgBody}; padding: 60px 0;">
            <tr>
                <td align="center">
                    
                    <table border="0" cellpadding="0" cellspacing="0" class="main-table" width="${styles.containerWidth}" style="background-color: rgba(18, 18, 18, 0.95); border-radius: ${styles.borderRadius}; border: 1px solid ${styles.border}; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.6); backdrop-filter: blur(10px);">
                        
                        <tr>
                            <td align="center" style="padding: 50px 0 40px 0; border-bottom: 1px solid ${styles.border}; background: linear-gradient(180deg, rgba(30,30,30,0.5) 0%, rgba(18,18,18,0) 100%);">
                                <a href="${baseUrl}" target="_blank">
                                    <img src="${logoUrl}" alt="Momentum Fit" width="220" style="font-family: sans-serif; color: #ffffff; font-size: 20px; text-align: center;">
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td class="content-padding" style="padding: 50px 50px; color: ${styles.textPrimary};">
                                <h1 style="margin: 0 0 30px 0; font-size: 24px; font-weight: 800; color: ${styles.textPrimary}; letter-spacing: -0.5px; text-transform: uppercase; text-align: center;">
                                    ${title}
                                </h1>
                                
                                <div style="font-size: 16px; line-height: 1.8; color: ${styles.textSecondary}; text-align: left;">
                                    ${content}
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td style="background-color: #0A0A0A; padding: 30px; text-align: center; border-top: 1px solid ${styles.border};">
                                <p style="margin: 0 0 10px 0; font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #555;">MOMENTUM FIT PLATFORM</p>
                                <p style="margin: 0; font-size: 11px; color: #444;">
                                    Este é um e-mail automático. Por favor, não responda.<br>
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

// CTA Button - Estilo "Neon"
const createButton = (link, text) => `
    <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 40px; margin-bottom: 20px; width: 100%;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" bgcolor="${styles.accent}" style="border-radius: 8px; box-shadow: 0 4px 15px rgba(190, 242, 2, 0.3);">
                            <a href="${link}" target="_blank" style="display: inline-block; padding: 18px 40px; font-family: ${styles.fontFamily}; font-size: 14px; font-weight: 800; color: #000000; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
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
    // ADMIN
    pendingTrainer: (data) => ({ title: 'Solicitação de Personal', text: `Um novo personal trainer, ${highlight(data.name)} (<a href="mailto:${data.email}" style="color:${styles.accent}">${data.email}</a>), realizou o cadastro.<br>Verifique as credenciais para aprovação.` }),
    pendingClient: (data) => ({ title: 'Novo Cliente', text: `O cliente ${highlight(data.name)} completou o cadastro e aguarda vinculação.` }),
    newMessageAdmin: (data) => ({ title: 'Nova Mensagem', text: `O usuário ${highlight(data.name)} enviou uma mensagem:<br><br><em>"${data.subject}"</em>` }),
    newWorkoutCreated: (data) => ({ title: 'Novo Treino Criado', text: `O personal ${highlight(data.trainerName)} criou o treino "${accent(data.workoutTitle)}".` }),

    // PERSONAL
    newMessageTrainer: (data) => ({ title: 'Nova Mensagem', text: `Seu aluno ${highlight(data.clientName)} enviou uma mensagem no chat.` }),
    clientAssigned: (data) => ({ title: 'Novo Aluno', text: `Você recebeu um novo aluno! ${highlight(data.clientName)} foi adicionado à sua lista.` }),
    newArticle: (data) => ({ title: 'Novo Artigo', text: `Um novo artigo foi publicado: ${highlight(data.articleTitle)}.` }),

    // ALUNO
    newMessageClient: (data) => ({ title: 'Mensagem do Personal', text: `${highlight(data.trainerName)} respondeu sua mensagem no chat.` }),
    registrationApproved: () => ({ title: 'Bem-vindo(a)!', text: `Sua conta na Momentum Fit foi aprovada. Seu personal entrará em contato em breve para iniciar sua jornada.` }),
    newWorkout: (data) => ({ title: 'Novo Treino', text: `Um novo treino foi adicionado à sua rotina: <br><br>${accent(data.workoutTitle)}` }),
    workoutEdited: (data) => ({ title: 'Treino Atualizado', text: `Seu personal fez ajustes no treino ${highlight(data.workoutTitle)}.` }),
    firstWorkout: (data) => ({ title: 'Primeiro Treino', text: `Seu primeiro treino "${accent(data.workoutTitle)}" já está disponível!` }),

    // GENÉRICO
    custom: (data) => ({ title: 'Notificação', text: data.text })
};

const generateEmailTemplate = (type, role, data, link, linkText, host) => {
    let templateKey = type;
    
    // Roteamento inteligente de templates
    if (type === 'newMessage') {
        if (role === 'admin') templateKey = 'newMessageAdmin';
        else if (role === 'trainer') templateKey = 'newMessageTrainer';
        else templateKey = 'newMessageClient';
    }

    const templateFn = templates[templateKey] || templates.custom;
    const { title, text } = templateFn(data);

    let bodyContent = text;
    let fullLink = '#';
    
    // Tratamento de Link
    if (link) {
        fullLink = link.startsWith('http') ? link : (host.startsWith('http') ? `${host}${link}` : `https://${host}${link}`);
        bodyContent += createButton(fullLink, linkText || 'Acessar');
    }

    return {
        subject: title,
        html: getBaseLayout(title, title, bodyContent, host)
    };
};

module.exports = { generateEmailTemplate };
