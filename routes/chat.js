const notificationService = require('../utils/notificationService');
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

        // Lógica de contatos do chat
        if (role === 'superadmin') {
            // Super Admin vê TODOS (exceto ele mesmo)
            query = "SELECT id, name, role FROM users WHERE id != $1 ORDER BY name ASC";
            params = [id];
        } else if (role === 'client') {
            // Cliente vê apenas seu treinador
            if (status !== 'active') {
                return res.render('pages/chat', { 
                    title: 'Chat', 
                    chatUsers: [],
                    user: req.session.user,
                    currentPage: 'chat'
                }); 
            }
            query = `
                SELECT u.id, u.name 
                FROM users u 
                JOIN client_profiles cp ON u.id = cp.assigned_trainer_id 
                WHERE cp.user_id = $1`;
            params = [id];
        } else {
            // Personal vê apenas seus alunos
            query = `
                SELECT u.id, u.name 
                FROM users u 
                JOIN client_profiles cp ON u.id = cp.user_id 
                WHERE cp.assigned_trainer_id = $1`;
            params = [id];
        }
        
        const result = await pool.query(query, params);
        
        // Formata lista para Super Admin saber quem é quem
        const users = result.rows.map(u => {
            if (role === 'superadmin' && u.role) {
                const roleName = u.role === 'trainer' ? 'Personal' : (u.role === 'client' ? 'Aluno' : 'Admin');
                return { ...u, name: `${u.name} (${roleName})` };
            }
            return u;
        });

        // IMPORTANTE: Passamos 'currentPage: chat' para o menu saber que deve destacar "Mensagens"
        res.render('pages/chat', { 
            title: 'Chat - Momentum Fit', 
            chatUsers: users,
            user: req.session.user,
            currentPage: 'chat' 
        });

    } catch (err) { 
        console.error(err); 
        res.status(500).render('pages/error', { message: "Erro ao carregar chat." }); 
    }
});

router.get('/messages/:contactId', async (req, res) => {
    try {
        const { id: userId } = req.session.user;
        const result = await pool.query(`
            SELECT id, sender_id, content, message_type, created_at 
            FROM messages 
            WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) 
            ORDER BY created_at ASC`, 
            [userId, req.params.contactId]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Erro mensagens" }); }
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
        // Notificação de Mensagem
        if (req.body.receiverId) {
            await notificationService.notifyNewMessage(req.session.user.name, req.body.receiverId);
        }
            [sender_id, receiver_id, messageContent, messageType]
        );
        
        notificationService.notifyNewMessage(senderName, receiver_id).catch(e => console.error(e));
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Erro envio." }); }
});

module.exports = router;
