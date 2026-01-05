const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewMessageEmail } = require('../utils/emailService');
const multer = require('multer');
const { put, handleUpload } = require('@vercel/blob'); // Adicionado handleUpload

// Multer agora é usado apenas como fallback ou para arquivos pequenos, 
// mas o upload principal será via Client-Side para evitar o limite de 4.5MB.
const upload = multer({ storage: multer.memoryStorage() });

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

// NOVA ROTA: Autoriza o upload direto do navegador para o Vercel Blob
router.post('/upload/authorize', requireAuth, async (req, res) => {
  const { body } = req;
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Gera um token seguro para este upload específico
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'],
          tokenPayload: JSON.stringify({
            userId: req.session.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload concluído via Client-Side:', blob.url);
      },
    });
    res.json(jsonResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API Enviar Mensagem (Atualizada para aceitar URL do Client-Side)
router.post('/send', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const recipient_id = req.body.recipient_id || req.body.receiver_id;
        const textContent = req.body.content;
        // Se o client-side upload funcionou, a URL virá no corpo como fileUrl
        const clientSideFileUrl = req.body.fileUrl; 
        const senderId = req.session.user.id;

        if (!recipient_id) throw new Error("ID do destinatário não fornecido.");
        
        let finalContent = textContent || '';
        let messageType = 'text';

        // Lógica 1: Arquivo veio via URL (Client-Side Upload - Preferido para > 4.5MB)
        if (clientSideFileUrl) {
            finalContent = clientSideFileUrl;
            
            // Tenta adivinhar o tipo pela extensão
            if (finalContent.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                messageType = 'image';
            } else if (finalContent.match(/\.(mp4|webm|mov)$/i)) {
                messageType = 'video';
            } else {
                messageType = 'file';
            }
        }
        // Lógica 2: Arquivo veio direto no request (Server-Side - Fallback para pequenos)
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

        if (!finalContent && !req.file && !clientSideFileUrl) {
             return res.redirect(`/chat?user_id=${recipient_id}`);
        }

        await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4)",
            [senderId, recipient_id, finalContent, messageType]
        );

        // Notificação
        const receiverRes = await pool.query("SELECT email, name FROM users WHERE id = $1", [recipient_id]);
        if (receiverRes.rows.length > 0) {
            const receiver = receiverRes.rows[0];
            const emailPreview = (messageType === 'text') ? finalContent : `Enviou um(a) ${messageType}`;
            sendNewMessageEmail(receiver.email, req.session.user.name, emailPreview, req.headers.host).catch(console.error);
        }

        res.redirect(`/chat?user_id=${recipient_id}`);
    } catch (err) {
        console.error("Erro no envio:", err);
        if (req.body.recipient_id) {
             res.redirect(`/chat?user_id=${req.body.recipient_id}`);
        } else {
             res.status(500).render('pages/error', { message: 'Erro ao enviar mensagem.' });
        }
    }
});

module.exports = router;
