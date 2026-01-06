const baseStyle = `
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 8px;
    background-color: #f9f9f9;
`;

const headerStyle = `
    background-color: #000;
    color: #ccff00;
    padding: 20px;
    text-align: center;
    border-radius: 8px 8px 0 0;
    font-size: 24px;
    font-weight: bold;
`;

const buttonStyle = `
    display: inline-block;
    padding: 12px 24px;
    background-color: #ccff00;
    color: #000;
    text-decoration: none;
    border-radius: 30px;
    font-weight: bold;
    margin-top: 20px;
    text-align: center;
`;

// Template: Boas-vindas ao Cliente (Com link para o questionário no perfil)
const welcomeClientTemplate = (name, link) => `
<div style="${baseStyle}">
    <div style="${headerStyle}">BEM-VINDO AO MOMENTUM!</div>
    <div style="padding: 20px; background-color: #fff;">
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Seu cadastro foi realizado com sucesso. Estamos empolgados em começar essa jornada com você.</p>
        <p>Para que possamos montar o treino perfeito, precisamos que você mantenha sua <strong>Anamnese (Questionário Inicial)</strong> sempre atualizada.</p>
        <p>Você pode editar suas respostas a qualquer momento no seu perfil:</p>
        <div style="text-align: center;">
            <a href="${link}" style="${buttonStyle}">Acessar Meu Perfil</a>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
            Se o botão não funcionar, acesse: ${link}
        </p>
    </div>
</div>
`;

// Template: Notificação para o Treinador/Admin
const newClientNotificationTemplate = (clientName, clientEmail) => `
<div style="${baseStyle}">
    <div style="${headerStyle}">NOVO ALUNO CADASTRADO</div>
    <div style="padding: 20px; background-color: #fff;">
        <p>Um novo aluno acabou de se cadastrar na plataforma.</p>
        <ul>
            <li><strong>Nome:</strong> ${clientName}</li>
            <li><strong>Email:</strong> ${clientEmail}</li>
            <li><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</li>
        </ul>
        <p>Acesse o painel administrativo para visualizar a anamnese e atribuir um treino.</p>
        <div style="text-align: center;">
            <a href="https://momentum-fit.vercel.app/admin/clients" style="${buttonStyle}">Ver Alunos</a>
        </div>
    </div>
</div>
`;

const newWorkoutTemplate = (clientName, workoutTitle, link) => `
<div style="${baseStyle}">
    <div style="${headerStyle}">NOVO TREINO DISPONÍVEL</div>
    <div style="padding: 20px; background-color: #fff;">
        <p>Fala, <strong>${clientName}</strong>!</p>
        <p>Seu treinador acabou de liberar um novo treino para você:</p>
        <h3 style="color: #000; border-left: 4px solid #ccff00; padding-left: 10px;">${workoutTitle}</h3>
        <p>Acesse agora para ver os detalhes:</p>
        <div style="text-align: center;">
            <a href="${link}" style="${buttonStyle}">Ver Treino</a>
        </div>
    </div>
</div>
`;

const newMessageTemplate = (senderName, contentPreview, link) => `
<div style="${baseStyle}">
    <div style="${headerStyle}">NOVA MENSAGEM</div>
    <div style="padding: 20px; background-color: #fff;">
        <p>Você recebeu uma nova mensagem de <strong>${senderName}</strong>:</p>
        <blockquote style="font-style: italic; color: #666; border-left: 3px solid #ccc; padding-left: 10px; margin: 20px 0;">
            "${contentPreview}"
        </blockquote>
        <div style="text-align: center;">
            <a href="${link}" style="${buttonStyle}">Responder no Chat</a>
        </div>
    </div>
</div>
`;

const resetPasswordTemplate = (link) => `
<div style="${baseStyle}">
    <div style="${headerStyle}">RECUPERAÇÃO DE SENHA</div>
    <div style="padding: 20px; background-color: #fff;">
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <div style="text-align: center;">
            <a href="${link}" style="${buttonStyle}">Redefinir Senha</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #888;">Se você não solicitou isso, apenas ignore este e-mail.</p>
    </div>
</div>
`;

module.exports = { 
    welcomeClientTemplate, 
    newClientNotificationTemplate, 
    newWorkoutTemplate, 
    newMessageTemplate, 
    resetPasswordTemplate 
};
