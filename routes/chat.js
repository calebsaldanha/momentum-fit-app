const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');
const multer = require('multer');
const { put } = require('@vercel/blob'); 

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const requireAuth = (req, res, next) => { if (!req.session.user) return res.redirect('/auth/login'); next(); };

router.use(requireAuth);

router.get('/', async (req, res) => {
    try {
        const { id, role, status } = req.session.user;
        let query;
        let params = [];

        if (role === 'superadmin') {
            query = "SELECT id, name, role FROM users WHERE id != $1 ORDER BY name ASC";
            params = [id];
        } else if (role === 'client') {
            if (status !== 'active') {
                return res.render('pages/chat', { 
                    title: 'Chat', 
                    chatUsers: [],
                    user: req.session.user,
                    currentPage: 'chat',
                    csrfToken: res.locals.csrfToken
                }); 
            }
            query = `
                SELECT u.id, u.name 
                FROM users u 
                JOIN client_profiles cp ON u.id = cp.assigned_trainer_id 
                WHERE cp.user_id = $1`;
            params = [id];
        } else {
            query = `
                SELECT u.id, u.name 
                FROM users u 
                JOIN client_profiles cp ON u.id = cp.user_id 
                WHERE cp.assigned_trainer_id = $1`;
            params = [id];
        }
        
        const result = await pool.query(query, params);
        
        const users = result.rows.map(u => {
            if (role === 'superadmin' && u.role) {
                const roleName = u.role === 'trainer' ? 'Personal' : (u.role === 'client' ? 'Aluno' : 'Admin');
                return { ...u, name: `${u.name} (${roleName})` };
            }
            return u;
        });

        res.render('pages/chat', { 
            title: 'Chat', 
            chatUsers: users,
            user: req.session.user,
            currentPage: 'chat',
            csrfToken: res.locals.csrfToken
        });

    } catch (err) { 
        console.error(err); 
        res.status(500).render('pages/error', { message: "Erro ao carregar chat." }); 
    }
});

// API: Carregar Mensagens e MARCAR NOTIFICAÇÕES COMO LIDAS
router.get('/messages/:contactId', async (req, res) => {
    try {
        const { id: userId } = req.session.user;
        const contactId = req.params.contactId;

        // 1. Buscar Mensagens
        const result = await pool.query(`
            SELECT id, sender_id, content, message_type, created_at 
            FROM messages 
            WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) 
            ORDER BY created_at ASC`, 
            [userId, contactId]
        );

        // 2. Marcar notificações de Chat como lidas automaticamente
        // Funciona para Aluno e Personal ao abrir a conversa
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE user_id = $1 AND (link = '/chat' OR title LIKE '%Mensagem%')",
            [userId]
        );

        res.json(result.rows);
    } catch (err) { 
        console.error("Erro ao carregar msg:", err);
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
            const filename = `${Date.now()}-${req.file.originalname}`;
            const blob = await put(filename, req.file.buffer, { access: 'public', contentType: req.file.mimetype });
            messageContent = blob.url;
            messageType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
        }
        
        const result = await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *', 
            [sender_id, receiver_id, messageContent, messageType]
        );
        
        // Notificação de Nova Mensagem
        notificationService.notifyNewMessage(senderName, receiver_id).catch(e => console.error(e));
        
        res.status(201).json(result.rows[0]);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Erro envio." }); 
    }
});

module.exports = router;
