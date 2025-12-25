const styles = {
    bgBody: '#050505',
    bgCard: '#121212',
    bgHeader: '#121212',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    accent: '#BEF202',
    border: '#2A2A2A',
    fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    containerWidth: '600px',
    borderRadius: '12px',
};

const getBaseLayout = (preheader, title, content, host) => {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const logoUrl = host ? `${protocol}://${host}/images/momentum-fit-logo-completo.png` : 'https://placehold.co/200x50/121212/BEF202?text=Momentum+Fit';
    
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body { margin: 0; padding: 0; background-color: ${styles.bgBody}; -webkit-font-smoothing: antialiased; }
            a { color: ${styles.accent}; text-decoration: none; }
            @media only screen and (max-width: 600px) {
                .main-table { width: 100% !important; }
                .content-padding { padding: 20px !important; }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${styles.bgBody}; font-family: ${styles.fontFamily};">
        <div style="display: none; max-height: 0px; overflow: hidden;">
            ${preheader}
            &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        </div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${styles.bgBody}; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" class="main-table" width="${styles.containerWidth}" style="background-color: ${styles.bgCard}; border-radius: ${styles.borderRadius}; border: 1px solid ${styles.border}; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                        <tr>
                            <td align="center" style="padding: 40px 0 30px 0; border-bottom: 1px solid ${styles.border};">
                                <a href="${protocol}://${host}" target="_blank">
                                    <img src="${logoUrl}" alt="Momentum Fit" width="160" style="display: block; border: 0; max-width: 100%;">
                                </a>
                            </td>
                        </tr>
                        <tr>
                            <td class="content-padding" style="padding: 40px 50px; color: ${styles.textPrimary};">
                                <h1 style="margin: 0 0 25px 0; font-size: 24px; font-weight: 700; color: ${styles.textPrimary}; letter-spacing: -0.5px; text-transform: uppercase;">
                                    ${title}
                                </h1>
                                <div style="font-size: 16px; line-height: 1.6; color: ${styles.textSecondary};">
                                    ${content}
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #0F0F0F; padding: 30px; text-align: center; border-top: 1px solid ${styles.border};">
                                <p style="margin: 0 0 10px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Momentum Fit</p>
                                <p style="margin: 0; font-size: 11px; color: #444;">
                                    Este é um e-mail automático, por favor não responda.<br>
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

const createButton = (link, text) => `
    <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 35px; margin-bottom: 10px;">
        <tr>
            <td align="center" bgcolor="${styles.accent}" style="border-radius: 6px;">
                <a href="${link}" target="_blank" style="display: inline-block; padding: 14px 30px; font-family: ${styles.fontFamily}; font-size: 14px; font-weight: 700; color: #000000; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${text}
                </a>
            </td>
        </tr>
    </table>
`;

const highlight = (text) => `<span style="color: ${styles.textPrimary}; font-weight: 600;">${text}</span>`;
const accent = (text) => `<span style="color: ${styles.accent}; font-weight: 600;">${text}</span>`;

const adminTemplates = {
    pendingTrainer: (name, email) => ({
        title: 'Solicitação de Personal',
        preheader: 'Novo cadastro de personal aguardando aprovação.',
        text: `Um novo personal trainer, ${highlight(name)} (<a href="mailto:${email}" style="color:${styles.accent}">${email}</a>), realizou o cadastro na plataforma.<br><br>Verifique as credenciais e aprove o acesso para que ele possa começar a atender.`
    }),
    pendingClient: (name, email) => ({
        title: 'Novo Cliente Cadastrado',
        preheader: 'Um novo cliente precisa ser vinculado.',
        text: `O cliente ${highlight(name)} completou o cadastro com sucesso. Ele está aguardando a vinculação a um personal trainer para iniciar seus treinos.`
    }),
    newWorkoutCreated: (trainerName, workoutTitle) => ({
        title: 'Atividade na Plataforma',
        preheader: `${trainerName} criou um novo treino.`,
        text: `O personal ${highlight(trainerName)} acabou de criar e publicar o treino: <br><br>${accent(workoutTitle)}.`
    }),
    newMessage: (name, subject) => ({
        title: 'Nova Mensagem',
        preheader: `Você recebeu uma mensagem de ${name}.`,
        text: `O usuário ${highlight(name)} enviou uma mensagem.<br><br><strong>Assunto:</strong> ${subject}<br><br>Acesse o chat para visualizar.`
    })
};

const trainerTemplates = {
    newMessage: (clientName) => ({
        title: 'Nova Mensagem',
        preheader: `${clientName} enviou uma mensagem.`,
        text: `Seu aluno ${highlight(clientName)} enviou uma nova mensagem no chat privado. Responda o quanto antes para manter o engajamento.`
    }),
    clientAssigned: (clientName) => ({
        title: 'Novo Aluno Atribuído',
        preheader: 'Sua carteira de alunos cresceu!',
        text: `Você recebeu um novo aluno! ${highlight(clientName)} foi adicionado à sua lista. <br><br>Acesse o perfil do aluno para realizar a anamnese e criar o primeiro treino.`
    }),
    newArticle: (articleTitle) => ({
        title: 'Novo Conteúdo Publicado',
        preheader: 'Fique por dentro das novidades.',
        text: `Um novo artigo técnico foi publicado na plataforma: <br><br>${accent(articleTitle)}<br><br>Mantenha-se atualizado com as melhores práticas.`
    })
};

const clientTemplates = {
    newMessage: (trainerName) => ({
        title: 'Nova Mensagem do Personal',
        preheader: 'Seu treinador respondeu.',
        text: `${highlight(trainerName)} enviou uma resposta no chat. Acesse a plataforma para visualizar a orientação completa.`
    }),
    registrationApproved: () => ({
        title: 'Bem-vindo à Momentum Fit',
        preheader: 'Seu cadastro foi aprovado!',
        text: `Tudo pronto! Sua conta foi ativada com sucesso. <br><br>Agora você faz parte da comunidade Momentum Fit. Em breve seu personal trainer entrará em contato para definir seus objetivos.`
    }),
    newWorkout: (workoutTitle) => ({
        title: 'Novo Desafio Disponível',
        preheader: 'Um novo treino foi adicionado à sua rotina.',
        text: `É hora de evoluir. Um novo treino foi adicionado à sua biblioteca: <br><br>${accent(workoutTitle)}.`
    }),
    workoutEdited: (workoutTitle) => ({
        title: 'Treino Atualizado',
        preheader: 'Ajustes no seu plano de treino.',
        text: `Seu personal fez ajustes importantes no treino ${highlight(workoutTitle)}. <br>Confira as alterações de carga e repetições antes da próxima sessão.`
    }),
    newArticle: (articleTitle) => ({
        title: 'Dica de Saúde',
        preheader: 'Conteúdo exclusivo para você.',
        text: `Confira o novo artigo em nosso blog: <br><br>${highlight(articleTitle)}<br><br>Informação de qualidade faz parte do seu resultado.`
    })
};

const generateEmailTemplate = (type, role, data, link, linkText, host) => {
    let templateData;
    if (role === 'admin' && adminTemplates[type]) {
        templateData = adminTemplates[type](...Object.values(data));
    } else if (role === 'trainer' && trainerTemplates[type]) {
        templateData = trainerTemplates[type](...Object.values(data));
    } else if (role === 'client' && clientTemplates[type]) {
        templateData = clientTemplates[type](...Object.values(data));
    } else {
        templateData = {
            title: 'Nova Notificação',
            preheader: 'Você tem uma nova notificação Momentum Fit.',
            text: 'Você tem uma atualização importante em sua conta.'
        };
    }

    let fullLink = '#';
    if (link) {
        fullLink = link.startsWith('http') ? link : `https://${host}${link}`;
    }

    let bodyContent = templateData.text;
    if (link) {
        bodyContent += createButton(fullLink, linkText || 'Acessar Plataforma');
    }

    return {
        subject: templateData.title,
        html: getBaseLayout(templateData.preheader, templateData.title, bodyContent, host)
    };
};

module.exports = { generateEmailTemplate };
