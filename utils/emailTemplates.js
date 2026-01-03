const styles = {
    body: 'background-color: #f4f6f9; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; padding: 20px; color: #333;',
    container: 'max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);',
    header: 'background-color: #1a1a1a; padding: 30px 20px; text-align: center;',
    logo: 'color: #ffffff; font-size: 24px; font-weight: 800; text-decoration: none; letter-spacing: 1px;',
    logoAccent: 'color: #e74c3c;',
    content: 'padding: 40px 30px; line-height: 1.6; color: #555;',
    button: 'display: inline-block; background-color: #e74c3c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px;',
    footer: 'background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;',
    highlight: 'color: #1a1a1a; font-weight: 700;'
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
            <h2 style="color: #1a1a1a; margin-top: 0;">${title}</h2>
            ${bodyContent}
            ${actionButton ? `<div style="text-align: center; margin-top: 30px;">${actionButton}</div>` : ''}
        </div>
        <div style="${styles.footer}">
            <p>&copy; ${new Date().getFullYear()} Momentum Fit. Todos os direitos reservados.</p>
            <p>Este é um email automático, por favor não responda.</p>
        </div>
    </div>
</body>
</html>
`;

module.exports = {
    resetPassword: (link) => baseTemplate(
        'Redefinição de Senha',
        `<p>Você solicitou a recuperação da sua senha.</p>
         <p>Clique no botão abaixo para criar uma nova senha. Este link expira em 1 hora.</p>`,
        `<a href="${link}" style="${styles.button}">Redefinir Minha Senha</a>`
    ),

    passwordChanged: (name) => baseTemplate(
        'Senha Alterada com Sucesso',
        `<p>Olá, <span style="${styles.highlight}">${name}</span>.</p>
         <p>Confirmamos que sua senha foi alterada com sucesso. Se você não realizou esta ação, entre em contato conosco imediatamente.</p>`
    ),

    adminPasswordReset: (name, newPassword) => baseTemplate(
        'Sua Senha foi Redefinida',
        `<p>Olá, <span style="${styles.highlight}">${name}</span>.</p>
         <p>Um administrador redefiniu sua senha de acesso.</p>
         <p style="background: #eee; padding: 15px; border-radius: 4px; text-align: center; font-family: monospace; font-size: 18px; margin: 20px 0;">
            ${newPassword}
         </p>
         <p>Recomendamos que você altere esta senha após o login.</p>`,
        `<a href="http://localhost:3000/auth/login" style="${styles.button}">Acessar Plataforma</a>`
    ),

    newMessage: (senderName, messagePreview, link) => baseTemplate(
        'Nova Mensagem Recebida',
        `<p>Você recebeu uma nova mensagem de <span style="${styles.highlight}">${senderName}</span>.</p>
         <blockquote style="border-left: 4px solid #e74c3c; padding-left: 15px; margin: 20px 0; color: #666; font-style: italic;">
            "${messagePreview}..."
         </blockquote>`,
        `<a href="${link}" style="${styles.button}">Responder no Chat</a>`
    ),

    articlePublished: (title, authorName, link) => baseTemplate(
        'Novo Artigo no Blog!',
        `<p>Um novo conteúdo acaba de ser publicado na plataforma.</p>
         <p><span style="${styles.highlight}">${title}</span></p>
         <p>Escrito por: ${authorName}</p>
         <p>Acesse agora para conferir as novidades!</p>`,
        `<a href="${link}" style="${styles.button}">Ler Artigo</a>`
    ),

    articlePending: (title, authorName, link) => baseTemplate(
        'Novo Artigo Aguardando Aprovação',
        `<p>O treinador <span style="${styles.highlight}">${authorName}</span> enviou um novo artigo.</p>
         <p><strong>Título:</strong> ${title}</p>
         <p>Por favor, revise o conteúdo para aprovação.</p>`,
        `<a href="${link}" style="${styles.button}">Gerenciar Artigos</a>`
    ),

    newWorkout: (workoutTitle, clientName, link) => baseTemplate(
        'Novo Treino Disponível',
        `<p>Um novo treino foi adicionado para <span style="${styles.highlight}">${clientName}</span>.</p>
         <p><strong>Treino:</strong> ${workoutTitle}</p>
         <p>Prepare-se para suar a camisa!</p>`,
        `<a href="${link}" style="${styles.button}">Ver Treino</a>`
    ),

    newUser: (name, email, role) => baseTemplate(
        'Novo Usuário Registrado',
        `<p>Um novo usuário acabou de se cadastrar na plataforma.</p>
         <ul style="list-style: none; padding: 0;">
            <li><strong>Nome:</strong> ${name}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Tipo:</strong> <span style="text-transform: capitalize;">${role === 'trainer' ? 'Personal' : 'Aluno'}</span></li>
         </ul>`,
        `<a href="http://localhost:3000/superadmin/manage" style="${styles.button}">Ver Usuários</a>`
    )
};
