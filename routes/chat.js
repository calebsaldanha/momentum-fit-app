const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewMessageEmail } = require('../utils/emailService');
const multer = require('multer');
const { put } = require('@vercel/blob');

// Configuração do Multer para Vercel Blob (Memória)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // Limite de 50MB
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

        // 1. BUSCAR LISTA DE CONTATOS
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

        // 2. LÓGICA DO CHAT ATIVO
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

// API Enviar Mensagem (Com Upload para Vercel Blob)
router.post('/send', requireAuth, upload.single('file'), async (req, res) => {
    try {
        // Captura dados do form (o multer processa antes, então req.body estará preenchido)
        // Aceita receiver_id ou recipient_id para compatibilidade
        const recipient_id = req.body.recipient_id || req.body.receiver_id;
        const textContent = req.body.content;
        const senderId = req.session.user.id;

        if (!recipient_id) {
            throw new Error("ID do destinatário não fornecido.");
        }
        
        let finalContent = textContent || '';
        let messageType = 'text';

        // Upload para Vercel Blob se houver arquivo
        if (req.file) {
            const filename = `chat/${Date.now()}-${req.file.originalname}`;
            
            // Upload usando a biblioteca @vercel/blob
            const blob = await put(filename, req.file.buffer, { 
                access: 'public', 
                contentType: req.file.mimetype 
            });
            
            finalContent = blob.url; // Salva a URL do Vercel Blob
            
            // Define tipo da mensagem
            if (req.file.mimetype.startsWith('image/')) {
                messageType = 'image';
            } else if (req.file.mimetype.startsWith('video/')) {
                messageType = 'video';
            } else {
                messageType = 'file';
            }
        }

        // Validação
        if (!finalContent && !req.file) {
             return res.redirect(`/chat?user_id=${recipient_id}`);
        }

        // Inserção no Banco
        await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4)",
            [senderId, recipient_id, finalContent, messageType]
        );

        // Notificação por E-mail
        const receiverRes = await pool.query("SELECT email, name FROM users WHERE id = $1", [recipient_id]);
        if (receiverRes.rows.length > 0) {
            const receiver = receiverRes.rows[0];
            const emailPreview = (messageType === 'text') ? finalContent : `Enviou um(a) ${messageType}`;
            // Envia sem await para não travar a resposta
            sendNewMessageEmail(receiver.email, req.session.user.name, emailPreview, req.headers.host).catch(console.error);
        }

        res.redirect(`/chat?user_id=${recipient_id}`);
    } catch (err) {
        console.error("Erro no envio:", err);
        // Tenta redirecionar de volta com erro ou renderiza página de erro
        if (req.body.recipient_id || req.body.receiver_id) {
             res.redirect(`/chat?user_id=${req.body.recipient_id || req.body.receiver_id}`);
        } else {
             res.status(500).render('pages/error', { message: 'Erro ao enviar mensagem.' });
        }
    }
});

module.exports = router;
