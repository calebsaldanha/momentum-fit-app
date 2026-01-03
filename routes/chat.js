const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');
const multer = require('multer');
const { put } = require('@vercel/blob'); 

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const requireAuth = (req, res, next) => { if (!req.session.user) return res.redirect('/auth/login'); next(); };

router.use(requireAuth);

// Página Principal do Chat
router.get('/', async (req, res) => {
    try {
        const { id, role, status } = req.session.user;
        const selectedUserId = req.query.user_id; // ID do usuário selecionado para conversa
        
        // --- NOVO: Limpa notificações genéricas de chat ao entrar na página ---
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE user_id = $1 AND (link = '/chat' OR title = 'Nova Mensagem')",
            [id]
        );

        let query;
        let params = [];

        // Lógica de listagem de usuários
        if (role === 'superadmin') {
            query = "SELECT id, name, role, profile_image FROM users WHERE id != $1 ORDER BY name ASC";
            params = [id];
        } else if (role === 'client') {
            if (status !== 'active') {
                return res.render('pages/chat', { 
                    title: 'Chat', chatUsers: [], user: req.session.user, currentPage: 'chat', csrfToken: res.locals.csrfToken, activeChat: null, messages: []
                }); 
            }
            query = `SELECT u.id, u.name, u.profile_image FROM users u JOIN client_profiles cp ON u.id = cp.assigned_trainer_id WHERE cp.user_id = $1`;
            params = [id];
        } else {
            query = `SELECT u.id, u.name, u.profile_image FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE cp.assigned_trainer_id = $1`;
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

        // Carrega conversa ativa se houver user_id
        let activeChat = null;
        let messages = [];

        if (selectedUserId) {
            // Verifica se o usuário selecionado está na lista permitida ou é válido
            const userCheck = await pool.query("SELECT id, name, profile_image FROM users WHERE id = $1", [selectedUserId]);
            if (userCheck.rows.length > 0) {
                activeChat = userCheck.rows[0];
                
                // Busca mensagens
                const msgsRes = await pool.query(`
                    SELECT id, sender_id, content, message_type, created_at 
                    FROM messages 
                    WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) 
                    ORDER BY created_at ASC`, 
                    [id, selectedUserId]
                );
                messages = msgsRes.rows;
            }
        }

        res.render('pages/chat', { 
            title: 'Chat - Momentum Fit', 
            chatUsers: users, 
            user: req.session.user, 
            currentPage: 'chat',
            csrfToken: res.locals.csrfToken,
            activeChat: activeChat,
            messages: messages
        });

    } catch (err) { 
        console.error(err); 
        res.status(500).render('pages/error', { message: "Erro ao carregar chat." }); 
    }
});

// API Mensagens (JSON) - Mantida caso seja usada via fetch em outro lugar
router.get('/messages/:contactId', async (req, res) => {
    try {
        const { id: userId } = req.session.user;
        const contactId = req.params.contactId;

        const result = await pool.query(`
            SELECT id, sender_id, content, message_type, created_at 
            FROM messages 
            WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) 
            ORDER BY created_at ASC`, 
            [userId, contactId]
        );

        await pool.query(
            "UPDATE notifications SET is_read = true WHERE user_id = $1 AND (link = '/chat' OR title = 'Nova Mensagem')",
            [userId]
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
        
        // Insere mensagem
        await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4)', 
            [sender_id, receiver_id, messageContent, messageType]
        );
        
        // Notifica
        notificationService.notifyNewMessage(senderName, receiver_id).catch(e => console.error(e));
        
        // Redireciona de volta para o chat com o usuário aberto
        res.redirect('/chat?user_id=' + receiver_id);
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: "Erro ao enviar mensagem." }); 
    }
});

module.exports = router;
