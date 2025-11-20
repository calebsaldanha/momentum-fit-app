const { Resend } = require('resend');
const { pool } = require('../database/db');

let resend;
let isResendInitialized = false;

// Cores e Marca do Momentum Fit
const BRAND_NAME = 'Momentum Fit';
const BRAND_COLOR = '#BEF202'; // Verde Limão Elétrico
const BRAND_TEXT_COLOR = '#222222';

function initializeResend() {
  if (isResendInitialized) {
    return resend;
  }
  
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    isResendInitialized = true;
    return resend;
  } else {
    isResendInitialized = false;
    return null;
  }
}

const fromEmail = process.env.EMAIL_FROM || `${BRAND_NAME} <onboarding@resend.dev>`;

const emailWrapper = (content) => `
  <div style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff;">
    <h1 style="color: ${BRAND_TEXT_COLOR}; font-size: 1.8em; border-bottom: 2px solid ${BRAND_COLOR}; padding-bottom: 10px;">${BRAND_NAME}</h1>
    ${content}
    <p style="font-size: 0.9em; color: #777; margin-top: 20px;">
      Atenciosamente,<br>
      Equipe ${BRAND_NAME}
    </p>
  </div>
`;

const templates = {
  new_message: (name, senderName) => ({
    subject: `Nova mensagem de ${senderName} - ${BRAND_NAME}`,
    html: emailWrapper(
      `<h2 style="color: ${BRAND_TEXT_COLOR};">Olá, ${name}!</h2>
       <p>Você recebeu uma nova mensagem de <strong>${senderName}</strong> na plataforma ${BRAND_NAME}.</p>
       <a href="https://momentum-fit-app.vercel.app/chat" style="display: inline-block; padding: 10px 15px; background-color: ${BRAND_COLOR}; color: ${BRAND_TEXT_COLOR}; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">
         Ver Mensagem
       </a>`
    ),
  }),
  new_workout: (name, workoutTitle) => ({
    subject: 'Seu novo treino está pronto!',
    html: emailWrapper(
      `<h2 style="color: ${BRAND_TEXT_COLOR};">Olá, ${name}!</h2>
       <p>Um novo plano de treino foi atribuído a você: <strong>${workoutTitle}</strong>. Está na hora de ir para o próximo nível!</p>
       <a href="https://momentum-fit-app.vercel.app/client/workouts" style="display: inline-block; padding: 10px 15px; background-color: ${BRAND_COLOR}; color: ${BRAND_TEXT_COLOR}; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">
         Acessar Treino
       </a>`
    ),
  }),
  new_article: (name, articleTitle) => ({
    subject: `Novidade: Artigo sobre ${articleTitle} publicado!`,
    html: emailWrapper(
      `<h2 style="color: ${BRAND_TEXT_COLOR};">Olá, ${name}!</h2>
       <p>Acabamos de publicar um novo artigo em nossa seção de conhecimento: <strong>${articleTitle}</strong>.</p>
       <a href="https://momentum-fit-app.vercel.app/articles" style="display: inline-block; padding: 10px 15px; background-color: ${BRAND_COLOR}; color: ${BRAND_TEXT_COLOR}; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">
         Ler Agora
       </a>`
    ),
  }),
  new_client: (adminName, clientName) => ({
    subject: '[AÇÃO NECESSÁRIA] Novo cliente cadastrado no Momentum Fit',
    html: emailWrapper(
      `<h2 style="color: ${BRAND_TEXT_COLOR};">Alerta, ${adminName}!</h2>
       <p>Um novo cliente se cadastrou na plataforma: <strong>${clientName}</strong>.</p>
       <p>É importante atribuir um personal qualificado a ele o mais rápido possível para manter o Momentum!</p>
       <a href="https://momentum-fit-app.vercel.app/admin/clients" style="display: inline-block; padding: 10px 15px; background-color: ${BRAND_COLOR}; color: ${BRAND_TEXT_COLOR}; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">
         Gerenciar Clientes
       </a>`
    ),
  }),
  new_trainer: (adminName, trainerName) => ({
    subject: '[AÇÃO NECESSÁRIA] Novo personal aguardando aprovação',
    html: emailWrapper(
      `<h2 style="color: ${BRAND_TEXT_COLOR};">Olá, ${adminName}!</h2>
       <p>Um novo personal se cadastrou e aguarda sua aprovação: <strong>${trainerName}</strong>.</p>
       <p>Analise o perfil do novo treinador e ative a conta para que ele comece a trabalhar.</p>
       <a href="https://momentum-fit-app.vercel.app/superadmin/dashboard" style="display: inline-block; padding: 10px 15px; background-color: ${BRAND_COLOR}; color: ${BRAND_TEXT_COLOR}; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">
         Aprovar Personais
       </a>`
    ),
  }),
  new_assignment: (trainerName, clientName) => ({
    subject: `Você foi atribuído a um novo cliente! - ${BRAND_NAME}`,
    html: emailWrapper(
      `<h2 style="color: ${BRAND_TEXT_COLOR};">Parabéns, ${trainerName}!</h2>
       <p>Você acaba de ser atribuído ao cliente <strong>${clientName}</strong>.</p>
       <p>Acesse o painel para ver os detalhes e dar o primeiro impulso na jornada dele!</p>
       <a href="https://momentum-fit-app.vercel.app/admin/clients" style="display: inline-block; padding: 10px 15px; background-color: ${BRAND_COLOR}; color: ${BRAND_TEXT_COLOR}; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">
         Ver Cliente
       </a>`
    ),
  }),
};

const getUserDetails = async (userId) => {
  try {
    const user = await pool.query('SELECT email, name FROM users WHERE id = $1', [userId]);
    if (user.rows.length > 0) {
      return user.rows[0];
    }
    return null;
  } catch (err) {
    console.error('Erro ao buscar detalhes do usuário:', err);
    return null;
  }
};

const sendEmail = async (type, userId, data = {}) => {
  const resendInstance = initializeResend();

  if (!resendInstance) {
    console.warn(`[AVISO] RESEND_API_KEY não está definida. Pulando envio de e-mail do tipo '${type}'. A aplicação continuará a funcionar.`);
    return;
  }

  const user = await getUserDetails(userId);
  if (!user) {
    console.warn(`Usuário ${userId} não encontrado. Pulando e-mail.`);
    return;
  }

  const templateBuilder = templates[type];
  if (!templateBuilder) {
    console.warn(`Template de e-mail '${type}' não encontrado.`);
    return;
  }
  
  const { subject, html } = templateBuilder(user.name, ...Object.values(data));

  try {
    await resendInstance.emails.send({
      from: fromEmail,
      to: user.email,
      subject: subject,
      html: html,
    });
    console.log(`E-mail '${type}' enviado para ${user.email}`);
  } catch (error) {
    console.error(`Falha ao enviar e-mail '${type}' para ${user.email}:`, error);
  }
};

module.exports = { sendEmail };
