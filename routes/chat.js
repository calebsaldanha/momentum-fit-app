const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');
const multer = require('multer');
const { put } = require('@vercel/blob'); 

// Configuração Multer (Memória para Serverless)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
};

router.use(requireAuth);

// Página do Chat
router.get('/', async (req, res) => {
    try {
        const { id: userId, role: userRole } = req.session.user;
        let users = [];

        // Se for personal/admin, vê clientes. Se for cliente, vê personais/admins.
        if (userRole === 'trainer' || userRole === 'superadmin') {
            const result = await pool.query("SELECT id, name FROM users WHERE role = 'client' ORDER BY name");
            users = result.rows;
        } else {
            const result = await pool.query("SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') ORDER BY name");
            users = result.rows;
        }

        res.render('pages/chat', {
            title: 'Chat - Momentum Fit',
            chatUsers: users
        });
    } catch (err) {
        console.error("Erro ao carregar página de chat:", err);
        res.status(500).render('pages/error', { message: "Não foi possível carregar o chat." });
    }
});

// API: Buscar mensagens (Correção: Template String limpa)
router.get('/messages/:contactId', async (req, res) => {
    try {
        const { id: userId } = req.session.user;
        const { contactId } = req.params;

        const query = `
            SELECT id, sender_id, content, message_type, created_at
            FROM messages
            WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC;
        `;
        const result = await pool.query(query, [userId, contactId]);
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar mensagens:", err);
        res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
});

// API: Enviar mensagem (com upload)
router.post('/send', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const { id: sender_id, name: senderName } = req.session.user;
        const { receiver_id, content } = req.body;
        
        let messageContent = content || '';
        let messageType = 'text';

        // Upload para Vercel Blob
        if (req.file) {
            try {
                const blob = await put(req.file.originalname, req.file.buffer, { 
                    access: 'public',
                    contentType: req.file.mimetype
                });
                messageContent = blob.url;
                
                if (req.file.mimetype.startsWith('image/')) messageType = 'image';
                else if (req.file.mimetype.startsWith('video/')) messageType = 'video';
                
            } catch (blobError) {
                console.error("Erro no Vercel Blob:", blobError);
                return res.status(500).json({ error: "Falha no upload da imagem." });
            }
        } else {
            if (!messageContent || messageContent.trim() === '') {
                return res.status(400).json({ error: "Mensagem vazia." });
            }
        }
        
        const query = 'INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *';
        const result = await pool.query(query, [sender_id, receiver_id, messageContent, messageType]);

        // Notificar sem travar a resposta
        notificationService.notifyNewMessage(senderName, receiver_id).catch(err => console.error("Erro notificação:", err));

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro envio:", err);
        res.status(500).json({ error: "Erro interno ao enviar mensagem." });
    }
});

module.exports = router;
