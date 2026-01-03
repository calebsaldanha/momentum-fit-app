const styles = {
    // Fundo geral escuro (bg-surface)
    body: 'background-color: #121212; font-family: "Montserrat", "Helvetica Neue", Helvetica, Arial, sans-serif; padding: 20px; color: #e0e0e0;',
    
    // Card do email (bg-card)
    container: 'max-width: 600px; margin: 0 auto; background-color: #181818; border: 1px solid #2A2A2A; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);',
    
    // Cabeçalho (bg-darkest)
    header: 'background-color: #050505; padding: 30px 20px; text-align: center; border-bottom: 1px solid #2A2A2A;',
    
    // Logo
    logo: 'color: #FFFFFF; font-size: 24px; font-weight: 800; text-decoration: none; letter-spacing: 1px;',
    logoAccent: 'color: #BEF202;', // Verde Neon da Plataforma
    
    // Conteúdo
    content: 'padding: 40px 30px; line-height: 1.6; color: #cccccc;',
    
    // Botão (accent-primary com texto preto para contraste)
    button: 'display: inline-block; background-color: #BEF202; color: #000000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 800; text-transform: uppercase; margin-top: 20px; box-shadow: 0 4px 15px rgba(190, 242, 2, 0.2);',
    
    // Rodapé
    footer: 'background-color: #050505; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #2A2A2A;',
    
    // Destaques de texto
    highlight: 'color: #BEF202; font-weight: 700;',
    
    // Citações/Blocos
    blockquote: 'border-left: 4px solid #BEF202; padding-left: 15px; margin: 20px 0; color: #a3a3a3; font-style: italic; background: rgba(255,255,255,0.03); padding: 15px;'
};

const baseTemplate = (title, bodyContent, actionButton = '') => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Momentum Fit</title>
</head>
<body style="${styles.body}">
    <div style="${styles.container}">
        <div style="${styles.header}">
            <a href="#" style="${styles.logo}">MOMENTUM <span style="${styles.logoAccent}">FIT</span></a>
        </div>
        <div style="${styles.content}">
            <h2 style="color: #FFFFFF; margin-top: 0; font-size: 24px; margin-bottom: 20px;">${title}</h2>
            ${bodyContent}
            ${actionButton ? `<div style="text-align: center; margin-top: 30px;">${actionButton}</div>` : ''}
        </div>
        <div style="${styles.footer}">
            <p>&copy; ${new Date().getFullYear()} Momentum Fit. Todos os direitos reservados.</p>
            <p style="margin-top: 10px;">Este é um email automático, por favor não responda.</p>
        </div>
    </div>
</body>
</html>
`;

module.exports = {
    // 1. Recuperação de Senha (Link)
    resetPassword: (link) => baseTemplate(
        'Redefinição de Senha',
        `<p>Você solicitou a recuperação da sua senha.</p>
         <p>Clique no botão abaixo para criar uma nova senha. Este link expira em 1 hora.</p>`,
        `<a href="${link}" style="${styles.button}">Redefinir Minha Senha</a>`
    ),

    // 2. Senha Alterada (Confirmação)
    passwordChanged: (name) => baseTemplate(
        'Senha Alterada com Sucesso',
        `<p>Olá, <span style="${styles.highlight}">${name}</span>.</p>
         <p>Confirmamos que sua senha foi alterada com sucesso.</p>
         <p>Se você não realizou esta ação, entre em contato conosco imediatamente.</p>`
    ),

    // 3. Senha Alterada pelo Admin
    adminPasswordReset: (name, newPassword) => baseTemplate(
        'Sua Senha foi Redefinida',
        `<p>Olá, <span style="${styles.highlight}">${name}</span>.</p>
         <p>Um administrador redefiniu sua senha de acesso.</p>
         <div style="background: rgba(190, 242, 2, 0.1); border: 1px solid #BEF202; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <span style="color: #BEF202; font-family: monospace; font-size: 20px; letter-spacing: 2px; font-weight: bold;">${newPassword}</span>
         </div>
         <p>Recomendamos que você altere esta senha após o login.</p>`,
        `<a href="http://localhost:3000/auth/login" style="${styles.button}">Acessar Plataforma</a>`
    ),

    // 4. Nova Mensagem no Chat
    newMessage: (senderName, messagePreview, link) => baseTemplate(
        'Nova Mensagem Recebida',
        `<p>Você recebeu uma nova mensagem de <span style="${styles.highlight}">${senderName}</span>.</p>
         <div style="${styles.blockquote}">
            "${messagePreview}..."
         </div>`,
        `<a href="${link}" style="${styles.button}">Responder no Chat</a>`
    ),

    // 5. Novo Artigo Publicado (Para Clientes/Trainers)
    articlePublished: (title, authorName, link) => baseTemplate(
        'Novo Artigo no Blog!',
        `<p>Um novo conteúdo acaba de ser publicado na plataforma.</p>
         <h3 style="color: #FFFFFF; font-size: 18px; margin: 15px 0;">${title}</h3>
         <p style="font-size: 14px; color: #888;">Escrito por: <span style="color: #BEF202;">${authorName}</span></p>
         <p>Acesse agora para conferir as dicas e novidades!</p>`,
        `<a href="${link}" style="${styles.button}">Ler Artigo</a>`
    ),

    // 6. Novo Artigo Pendente (Para Admin)
    articlePending: (title, authorName, link) => baseTemplate(
        'Novo Artigo Aguardando Aprovação',
        `<p>O treinador <span style="${styles.highlight}">${authorName}</span> enviou um novo artigo para revisão.</p>
         <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin: 15px 0;">
            <strong>Título:</strong> ${title}
         </div>
         <p>Por favor, acesse o painel para aprovar ou rejeitar.</p>`,
        `<a href="${link}" style="${styles.button}">Gerenciar Artigos</a>`
    ),

    // 7. Novo Treino Criado (Para Client e Admin)
    newWorkout: (workoutTitle, clientName, link) => baseTemplate(
        'Novo Treino Disponível',
        `<p>Um novo treino foi adicionado para <span style="${styles.highlight}">${clientName}</span>.</p>
         <h3 style="color: #BEF202; margin: 15px 0;">${workoutTitle}</h3>
         <p>Prepare-se para suar a camisa! Acesse sua conta para ver os detalhes.</p>`,
        `<a href="${link}" style="${styles.button}">Ver Treino</a>`
    ),

    // 8. Novo Usuário (Para Admin)
    newUser: (name, email, role) => baseTemplate(
        'Novo Registro no Sistema',
        `<p>Um novo usuário acabou de se cadastrar na plataforma.</p>
         <div style="background: rgba(255,255,255,0.05); border-left: 3px solid #BEF202; padding: 15px; border-radius: 4px;">
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 8px;"><strong>Nome:</strong> ${name}</li>
                <li style="margin-bottom: 8px;"><strong>Email:</strong> ${email}</li>
                <li><strong>Tipo:</strong> <span style="color: #BEF202; text-transform: uppercase; font-size: 12px; border: 1px solid #BEF202; padding: 2px 6px; border-radius: 4px;">${role === 'trainer' ? 'Personal' : 'Aluno'}</span></li>
            </ul>
         </div>`,
        `<a href="http://localhost:3000/superadmin/manage" style="${styles.button}">Ver Usuários</a>`
    )
};
