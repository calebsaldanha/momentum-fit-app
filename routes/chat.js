const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewMessageEmail } = require('../utils/emailService');
const multer = require('multer');
const { put, handleUpload } = require('@vercel/blob');

// Configuração do Multer (Memória) para fallback de arquivos pequenos
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 4.5 * 1024 * 1024 } // Limite de 4.5MB (limite da Vercel Serverless)
});

const requireAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/auth/login');
};

// Rota Principal do Chat
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const role = req.session.user.role;
        let contacts = [];

        // Lógica de Contatos
        if (role === 'client') {
            const trainerRes = await pool.query(`
                SELECT u.id, u.name, u.role, u.profile_image FROM users u 
                JOIN client_profiles cp ON cp.trainer_id = u.id 
                WHERE cp.user_id = $1
            `, [userId]);
            contacts = trainerRes.rows;
            
            if (contacts.length === 0) {
                const adminRes = await pool.query("SELECT id, name, role, profile_image FROM users WHERE role = 'superadmin'");
                contacts = adminRes.rows;
            }
        } else if (role === 'superadmin') {
            const allUsers = await pool.query("SELECT id, name, role, profile_image FROM users WHERE id != $1 ORDER BY name ASC", [userId]);
            contacts = allUsers.rows;
        } else {
            const clientsRes = await pool.query(`
                SELECT u.id, u.name, u.role, u.profile_image FROM users u 
                JOIN client_profiles cp ON cp.user_id = u.id 
                WHERE cp.trainer_id = $1
                ORDER BY u.name ASC
            `, [userId]);
            contacts = clientsRes.rows;
        }

        let activeChat = null;
        let messages = [];

        if (req.query.user_id) {
            const targetId = req.query.user_id;
            const targetRes = await pool.query("SELECT id, name, profile_image FROM users WHERE id = $1", [targetId]);
            
            if (targetRes.rows.length > 0) {
                activeChat = targetRes.rows[0];
                const msgRes = await pool.query(`
                    SELECT * FROM messages 
                    WHERE (sender_id = $1 AND receiver_id = $2) 
                       OR (sender_id = $2 AND receiver_id = $1) 
                    ORDER BY created_at ASC
                `, [userId, targetId]);
                messages = msgRes.rows;
                await pool.query("UPDATE messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2", [targetId, userId]);
            }
        }

        res.render('pages/chat', { 
            title: 'Mensagens', 
            user: req.session.user, 
            chatUsers: contacts,
            activeChat: activeChat,
            messages: messages,
            csrfToken: res.locals.csrfToken
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar chat.' });
    }
});

// Rota de Autorização Client-Side (Vercel Blob)
router.post('/upload/authorize', requireAuth, async (req, res) => {
  const { body } = req;
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'],
          tokenPayload: JSON.stringify({ userId: req.session.user.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload client-side concluído:', blob.url);
      },
    });
    res.json(jsonResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Envio de Mensagem (Suporta URL direta ou Arquivo via Multer)
router.post('/send', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const recipient_id = req.body.recipient_id || req.body.receiver_id;
        const textContent = req.body.content;
        const clientSideFileUrl = req.body.fileUrl; 
        const senderId = req.session.user.id;

        if (!recipient_id) return res.redirect('/chat');
        
        let finalContent = textContent || '';
        let messageType = 'text';

        // 1. Prioridade: URL vinda do Client-Side (Upload Rápido)
        if (clientSideFileUrl && clientSideFileUrl.trim() !== '') {
            finalContent = clientSideFileUrl;
            if (finalContent.match(/\.(jpg|jpeg|png|gif|webp)$/i)) messageType = 'image';
            else if (finalContent.match(/\.(mp4|webm|mov)$/i)) messageType = 'video';
            else messageType = 'file';
        }
        // 2. Fallback: Arquivo enviado diretamente pelo form (Server-Side)
        else if (req.file) {
            const filename = `chat/${Date.now()}-${req.file.originalname}`;
            const blob = await put(filename, req.file.buffer, { 
                access: 'public', 
                contentType: req.file.mimetype 
            });
            finalContent = blob.url;
            
            if (req.file.mimetype.startsWith('image/')) messageType = 'image';
            else if (req.file.mimetype.startsWith('video/')) messageType = 'video';
            else messageType = 'file';
        }

        // Se não tem conteúdo nenhum, ignora
        if (!finalContent && !req.file && !clientSideFileUrl) {
             return res.redirect(`/chat?user_id=${recipient_id}`);
        }

        await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4)",
            [senderId, recipient_id, finalContent, messageType]
        );

        // Notificação por e-mail
        const receiverRes = await pool.query("SELECT email, name FROM users WHERE id = $1", [recipient_id]);
        if (receiverRes.rows.length > 0) {
            const receiver = receiverRes.rows[0];
            const emailPreview = (messageType === 'text') ? finalContent : `Enviou um(a) ${messageType}`;
            sendNewMessageEmail(receiver.email, req.session.user.name, emailPreview, req.headers.host).catch(console.error);
        }

        res.redirect(`/chat?user_id=${recipient_id}`);
    } catch (err) {
        console.error("Erro no envio:", err);
        // Em caso de erro, tenta voltar pro chat
        const recipient = req.body.recipient_id || req.body.receiver_id;
        if (recipient) res.redirect(`/chat?user_id=${recipient}`);
        else res.status(500).render('pages/error', { message: 'Erro ao enviar mensagem.' });
    }
});

module.exports = router;
