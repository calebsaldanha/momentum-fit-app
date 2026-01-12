const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewMessageEmail } = require('../utils/emailService');
const multer = require('multer');
const { put, handleUpload } = require('@vercel/blob');

// Configuração Multer (Limite 4.5MB)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 4.5 * 1024 * 1024 }
});

const requireAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/auth/login');
};

// Rota Principal
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const role = req.session.user.role;
        let contacts = [];

        // Lógica de contatos CORRIGIDA (Baseada na tabela users)
        try {
            if (role === 'client') {
                // Aluno vê seu treinador (via users.trainer_id)
                const trainerRes = await pool.query(`
                    SELECT t.id, t.name, t.role, t.profile_image 
                    FROM users u 
                    JOIN users t ON u.trainer_id = t.id 
                    WHERE u.id = $1`, 
                    [userId]
                );
                contacts = trainerRes.rows;
                
                // Se não tiver treinador, mostra admin
                if (contacts.length === 0) {
                    const adminRes = await pool.query("SELECT id, name, role, profile_image FROM users WHERE role = 'superadmin'");
                    contacts = adminRes.rows;
                }
            } else if (role === 'superadmin') {
                const allUsers = await pool.query("SELECT id, name, role, profile_image FROM users WHERE id != $1 ORDER BY name ASC", [userId]);
                contacts = allUsers.rows;
            } else {
                // Treinador vê seus alunos (via users.trainer_id)
                const clientsRes = await pool.query(
                    "SELECT id, name, role, profile_image FROM users WHERE trainer_id = $1 AND role = 'client' ORDER BY name ASC", 
                    [userId]
                );
                contacts = clientsRes.rows;
            }
        } catch (dbErr) {
            console.error("Erro ao buscar contatos:", dbErr);
            contacts = [];
        }

        let activeChat = null;
        let messages = [];

        if (req.query.user_id) {
            const targetId = req.query.user_id;
            try {
                const targetRes = await pool.query("SELECT id, name, profile_image, role FROM users WHERE id = $1", [targetId]);
                if (targetRes.rows.length > 0) {
                    activeChat = targetRes.rows[0];
                    const msgRes = await pool.query("SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC", [userId, targetId]);
                    messages = msgRes.rows;
                    
                    // Marca mensagens como lidas
                    await pool.query("UPDATE messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2", [targetId, userId]);
                }
            } catch (chatErr) {
                console.error("Erro ao carregar mensagens:", chatErr);
            }
        }

        res.render('pages/chat', { 
            title: 'Mensagens', 
            user: req.session.user, 
            chatUsers: contacts || [],
            activeChat: activeChat,
            messages: messages || [],
            csrfToken: res.locals.csrfToken
        });

    } catch (err) {
        console.error('Erro crítico no chat:', err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar o sistema de mensagens.' });
    }
});

// Autenticação Upload Vercel
router.post('/upload/authorize', requireAuth, async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'],
        tokenPayload: JSON.stringify({ userId: req.session.user.id }),
      }),
      onUploadCompleted: async ({ blob }) => console.log('Upload concluído:', blob.url),
    });
    res.json(jsonResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Enviar Mensagem
router.post('/send', requireAuth, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Erro Multer:', err);
            req.flash('error_msg', 'Erro no upload.');
            return res.redirect('back');
        }
        next();
    });
}, async (req, res) => {
    try {
        const { recipient_id, content, fileUrl } = req.body;
        const senderId = req.session.user.id;
        
        let finalContent = content;
        let messageType = 'text';

        if (fileUrl) {
            finalContent = fileUrl;
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(finalContent)) messageType = 'image';
            else if (/\.(mp4|mov)$/i.test(finalContent)) messageType = 'video';
            else messageType = 'file';
        } else if (req.file) {
            const filename = `chat/${Date.now()}-${req.file.originalname}`;
            const blob = await put(filename, req.file.buffer, { access: 'public', contentType: req.file.mimetype });
            finalContent = blob.url;
            messageType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
        }

        if (!finalContent && !req.file) return res.redirect(`/chat?user_id=${recipient_id}`);

        await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4)",
            [senderId, recipient_id, finalContent, messageType]
        );

        // Notificação email
        const userRes = await pool.query("SELECT email FROM users WHERE id = $1", [recipient_id]);
        if (userRes.rows.length) {
             const preview = messageType === 'text' ? finalContent : 'Enviou um anexo';
             sendNewMessageEmail(userRes.rows[0].email, req.session.user.name, preview, req.headers.host).catch(e => console.error(e));
        }

        res.redirect(`/chat?user_id=${recipient_id}`);
    } catch (err) {
        console.error("Erro ao enviar msg:", err);
        res.redirect(`/chat?user_id=${req.body.recipient_id}`);
    }
});

module.exports = router;
