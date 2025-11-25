const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');
const multer = require('multer');
const { put } = require('@vercel/blob'); // Importa função do Vercel Blob

// Configura o Multer para usar a memória (não salva em disco)
// O arquivo fica na RAM temporariamente até enviarmos para o Vercel Blob
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // Limite de 50MB
});

const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
};

router.use(requireAuth);

router.get('/', async (req, res) => {
    try {
        const { id: userId, role: userRole } = req.session.user;
        let users = [];

        if (userRole === 'trainer' || userRole === 'superadmin') {
            const result = await pool.query("SELECT id, name FROM users WHERE role = 'client' ORDER BY name");
            users = result.rows;
        } else {
            const result = await pool.query("SELECT id, name FROM users WHERE role = 'trainer' OR role = 'superadmin' ORDER BY name");
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

// Rota de Envio com Suporte a Vercel Blob
router.post('/send', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const { id: sender_id, name: senderName } = req.session.user;
        const { receiver_id, content } = req.body;
        
        let messageContent = content || '';
        let messageType = 'text';

        // Se houver arquivo, faz upload para o Vercel Blob
        if (req.file) {
            console.log('Iniciando upload para Vercel Blob:', req.file.originalname);
            
            // Upload para o Vercel Blob
            const blob = await put(req.file.originalname, req.file.buffer, { 
                access: 'public',
                contentType: req.file.mimetype
            });

            // A URL pública do arquivo é salva como conteúdo da mensagem
            messageContent = blob.url;
            
            if (req.file.mimetype.startsWith('image/')) {
                messageType = 'image';
            } else if (req.file.mimetype.startsWith('video/')) {
                messageType = 'video';
            }
        } else {
            if (!messageContent || messageContent.trim() === '') {
                return res.status(400).json({ error: "Mensagem vazia." });
            }
        }
        
        const query = 'INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *';
        const result = await pool.query(query, [sender_id, receiver_id, messageContent, messageType]);

        await notificationService.notifyNewMessage(senderName, receiver_id);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        res.status(500).json({ error: "Erro ao processar mensagem: " + err.message });
    }
});

module.exports = router;
