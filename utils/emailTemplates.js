const styles = {
    bgBody: '#050505',
    bgCard: '#121212',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    accent: '#BEF202',
    border: '#2A2A2A',
    fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    containerWidth: '600px',
    borderRadius: '12px',
};

const getBaseLayout = (preheader, title, content, host) => {
    // Lógica para definir a URL da imagem
    // Se estiver em produção (com host definido), usa a imagem real do projeto.
    // Se for localhost, usa um placeholder profissional para testes.
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    // CAMINHO DA LOGO: Ajuste este nome de arquivo conforme o que está na sua pasta public/images/
    // Baseado nos seus arquivos, o nome é: momentum-fit-logo-completo.png
    const logoPath = '/images/momentum-fit-logo-completo.png';
    
    let logoUrl;
    if (host && !host.includes('localhost')) {
        logoUrl = `${protocol}://${host}${logoPath}`;
    } else {
        // Placeholder escuro com texto verde para testes locais
        logoUrl = 'https://placehold.co/400x100/121212/BEF202?text=MOMENTUM+FIT&font=montserrat';
    }
    
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
            @media only screen and (max-width: 600px) {
                .main-table { width: 100% !important; }
                .content-padding { padding: 20px !important; }
                .mobile-img { width: 100% !important; height: auto !important; }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${styles.bgBody}; font-family: ${styles.fontFamily};">
        
        <div style="display: none; max-height: 0px; overflow: hidden;">
            ${preheader}
            &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        </div>

        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${styles.bgBody}; padding: 40px 0;">
            <tr>
                <td align="center">
                    
                    <table border="0" cellpadding="0" cellspacing="0" class="main-table" width="${styles.containerWidth}" style="background-color: ${styles.bgCard}; border-radius: ${styles.borderRadius}; border: 1px solid ${styles.border}; overflow: hidden; box-shadow: 0 4px 30px rgba(0,0,0,0.5);">
                        
                        <tr>
                            <td align="center" style="padding: 40px 0 30px 0; border-bottom: 1px solid ${styles.border}; background-color: #0f0f0f;">
                                <a href="${protocol}://${host}" target="_blank">
                                    <img src="${logoUrl}" alt="Momentum Fit" width="200" style="font-family: sans-serif; color: #ffffff; font-size: 20px; text-align: center;">
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td class="content-padding" style="padding: 40px 50px; color: ${styles.textPrimary};">
                                <h1 style="margin: 0 0 25px 0; font-size: 22px; font-weight: 800; color: ${styles.textPrimary}; letter-spacing: -0.5px; text-transform: uppercase;">
                                    ${title}
                                </h1>
                                
                                <div style="font-size: 15px; line-height: 1.7; color: ${styles.textSecondary};">
                                    ${content}
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td style="background-color: #0F0F0F; padding: 30px; text-align: center; border-top: 1px solid ${styles.border};">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center" style="padding-bottom: 20px;">
                                           <span style="color: #444; font-size: 10px; font-weight: 700; letter-spacing: 2px;">MOMENTUM FIT PLATFORM</span>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0; font-size: 11px; color: #444;">
                                    Este é um e-mail automático. Por favor, não responda.<br>
                                    © ${new Date().getFullYear()} Momentum Fit. Todos os direitos reservados.
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

// Helper para botão (CTA)
const createButton = (link, text) => `
    <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 35px; margin-bottom: 15px; width: 100%;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" bgcolor="${styles.accent}" style="border-radius: 6px;">
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

// Definição dos templates de texto (Mantendo a lógica anterior que já estava boa)
const templates = {
    // ADMIN
    pendingTrainer: (data) => ({ title: 'Solicitação de Personal', text: `Um novo personal trainer, ${highlight(data.name)} (<a href="mailto:${data.email}" style="color:${styles.accent}">${data.email}</a>), realizou o cadastro.<br>Verifique as credenciais para aprovação.` }),
    pendingClient: (data) => ({ title: 'Novo Cliente', text: `O cliente ${highlight(data.name)} completou o cadastro e aguarda vinculação.` }),
    newMessageAdmin: (data) => ({ title: 'Nova Mensagem', text: `O usuário ${highlight(data.name)} enviou uma mensagem:<br><br><em>"${data.subject}"</em>` }),
    
    // PERSONAL
    newMessageTrainer: (data) => ({ title: 'Nova Mensagem', text: `Seu aluno ${highlight(data.clientName)} enviou uma mensagem no chat.` }),
    clientAssigned: (data) => ({ title: 'Novo Aluno', text: `Você recebeu um novo aluno! ${highlight(data.clientName)} foi adicionado à sua lista.` }),
    
    // ALUNO
    newMessageClient: (data) => ({ title: 'Mensagem do Personal', text: `${highlight(data.trainerName)} respondeu sua mensagem no chat.` }),
    registrationApproved: () => ({ title: 'Bem-vindo(a)!', text: `Sua conta na Momentum Fit foi aprovada. Seu personal entrará em contato em breve.` }),
    newWorkout: (data) => ({ title: 'Novo Treino', text: `Um novo treino foi adicionado à sua rotina: <br><br>${accent(data.workoutTitle)}` }),
    workoutEdited: (data) => ({ title: 'Treino Atualizado', text: `Seu personal fez ajustes no treino ${highlight(data.workoutTitle)}.` }),
    
    // GENÉRICO
    custom: (data) => ({ title: 'Notificação', text: data.text })
};

const generateEmailTemplate = (type, role, data, link, linkText, host) => {
    // Mapeamento simples para encontrar o template correto
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
        // Garante que o link seja absoluto
        fullLink = link.startsWith('http') ? link : (host.startsWith('http') ? `${host}${link}` : `https://${host}${link}`);
        bodyContent += createButton(fullLink, linkText || 'Acessar');
    }

    return {
        subject: title,
        html: getBaseLayout(title, title, bodyContent, host)
    };
};

module.exports = { generateEmailTemplate };
