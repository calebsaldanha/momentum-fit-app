const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');
const multer = require('multer');
const { put } = require('@vercel/blob'); 

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } 
});

const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
};

router.use(requireAuth);

router.get('/', async (req, res) => {
    try {
        const { id: userId, role: userRole } = req.session.user;
        let query;

        // Lógica de quem vê quem
        if (userRole === 'client') {
            query = "SELECT id, name FROM users WHERE role IN ('trainer', 'superadmin') ORDER BY name";
        } else {
            query = "SELECT id, name FROM users WHERE role = 'client' ORDER BY name";
        }
        
        const result = await pool.query(query);
        res.render('pages/chat', { title: 'Chat - Momentum Fit', chatUsers: result.rows });
    } catch (err) {
        res.status(500).render('pages/error', { message: "Erro chat." });
    }
});

router.get('/messages/:contactId', async (req, res) => {
    try {
        const { id: userId } = req.session.user;
        const result = await pool.query(
            "SELECT id, sender_id, content, message_type, created_at FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC", 
            [userId, req.params.contactId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erro mensagens" });
    }
});

router.post('/send', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const { id: sender_id, name: senderName } = req.session.user;
        const { receiver_id, content } = req.body;
        
        let messageContent = content || '';
        let messageType = 'text';

        if (req.file) {
            try {
                // CORREÇÃO: Timestamp para evitar sobrescrita
                const filename = \`\${Date.now()}-\${req.file.originalname}\`;
                
                const blob = await put(filename, req.file.buffer, { 
                    access: 'public',
                    contentType: req.file.mimetype
                });
                messageContent = blob.url;
                
                if (req.file.mimetype.startsWith('image/')) messageType = 'image';
                else if (req.file.mimetype.startsWith('video/')) messageType = 'video';
                
            } catch (blobError) {
                console.error("Erro Blob:", blobError);
                return res.status(500).json({ error: "Upload falhou." });
            }
        } else if (!messageContent.trim()) {
            return res.status(400).json({ error: "Mensagem vazia." });
        }
        
        const result = await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
            [sender_id, receiver_id, messageContent, messageType]
        );

        notificationService.notifyNewMessage(senderName, receiver_id).catch(e => console.error(e));

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro envio." });
    }
});

module.exports = router;
