const { pool } = require('../database/db');
const { sendEmail } = require('./emailService');

const getSuperAdminIds = async () => {
  try {
    const superAdmins = await pool.query("SELECT id FROM users WHERE role = 'superadmin'");
    return superAdmins.rows.map(admin => admin.id);
  } catch (err) {
    console.error('Erro ao buscar SuperAdmins:', err);
    return [];
  }
};

const createInAppNotification = async (userId, message, link, type) => {
  try {
    const query = 'INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4)';
    await pool.query(query, [userId, type, message, link]);
  } catch (err) {
    console.error('Erro ao criar notificação no app:', err);
  }
};

const notifyNewMessage = async (senderName, receiverId) => {
  const message = `Você tem uma nova mensagem de ${senderName}.`;
  const link = '/chat';
  const type = 'new_message';

  await createInAppNotification(receiverId, message, link, type);
  sendEmail(type, receiverId, { senderName });
};

const notifyNewWorkout = async (workoutTitle, clientId, workoutId) => {
  const message = `Um novo treino foi criado para você: ${workoutTitle}`;
  const link = `/workouts/${workoutId}`;
  const type = 'new_workout';
  
  await createInAppNotification(clientId, message, link, type);
  sendEmail(type, clientId, { workoutTitle });
};

const notifyNewArticle = async (articleTitle, articleId) => {
  const message = `Novo artigo publicado: ${articleTitle}`;
  const link = `/articles/${articleId}`;
  const type = 'new_article';

  try {
    const clients = await pool.query("SELECT id FROM users WHERE role = 'client'");
    if (clients.rows.length === 0) return;

    for (const client of clients.rows) {
      await createInAppNotification(client.id, message, link, type);
      sendEmail(type, client.id, { articleTitle });
    }
  } catch (err) {
    console.error('Erro ao notificar clientes sobre novo artigo:', err);
  }
};

const notifyNewClient = async (clientName, clientId) => {
  const message = `Novo cliente cadastrado: ${clientName}`;
  const link = `/admin/clients/${clientId}`;
  const type = 'new_client';
  
  const adminIds = await getSuperAdminIds();
  for (const adminId of adminIds) {
    await createInAppNotification(adminId, message, link, type);
    sendEmail(type, adminId, { clientName });
  }
};

const notifyNewTrainer = async (trainerName) => {
  const message = `Novo personal aguardando aprovação: ${trainerName}`;
  const link = '/superadmin/dashboard';
  const type = 'new_trainer';
  
  const adminIds = await getSuperAdminIds();
  for (const adminId of adminIds) {
    await createInAppNotification(adminId, message, link, type);
    sendEmail(type, adminId, { trainerName });
  }
};

const notifyClientAssignment = async (clientName, clientId, trainerId) => {
  const message = `Você foi atribuído a um novo cliente: ${clientName}.`;
  const link = `/admin/clients/${clientId}`;
  const type = 'new_assignment';
  
  await createInAppNotification(trainerId, message, link, type);
  sendEmail(type, trainerId, { clientName });
};


module.exports = {
  notifyNewMessage,
  notifyNewWorkout,
  notifyNewArticle,
  notifyNewClient,
  notifyNewTrainer,
  notifyClientAssignment
};
