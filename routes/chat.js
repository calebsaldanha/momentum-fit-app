const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');
const multer = require('multer');
const { put } = require('@vercel/blob'); 

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const requireAuth = (req, res, next) => { 
    if (!req.session.user) return res.redirect('/auth/login'); 
    next(); 
};

router.use(requireAuth);

// Página Principal do Chat
router.get('/', async (req, res) => {
    try {
        const { id, role, status } = req.session.user;
        const selectedUserId = req.query.user_id;
        
        // Limpa notificações
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE user_id = $1 AND (link = '/chat' OR title = 'Nova Mensagem')",
            [id]
        );

        let query;
        let params = [];

        // Lista usuários disponíveis para conversa
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

        let activeChat = null;
        let messages = [];

        if (selectedUserId) {
            const userCheck = await pool.query("SELECT id, name, profile_image FROM users WHERE id = $1", [selectedUserId]);
            if (userCheck.rows.length > 0) {
                activeChat = userCheck.rows[0];
                
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

// Envio de Mensagem
router.post('/send', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const { id: sender_id, name: senderName } = req.session.user;
        // CORREÇÃO: Mapeando recipient_id corretamente do formulário
        const { recipient_id, content } = req.body;
        
        let messageContent = content || '';
        let messageType = 'text';
        
        if (req.file) {
            const filename = `${Date.now()}-${req.file.originalname}`;
            const blob = await put(filename, req.file.buffer, { access: 'public', contentType: req.file.mimetype });
            messageContent = blob.url;
            
            // CORREÇÃO: Lógica aprimorada para tipos de arquivo
            if (req.file.mimetype.startsWith('image/')) {
                messageType = 'image';
            } else if (req.file.mimetype.startsWith('video/')) {
                messageType = 'video';
            } else {
                messageType = 'file'; // Para PDFs e outros documentos
            }
        } else if (!messageContent.trim()) {
            // Evita envio de mensagem vazia sem arquivo
            return res.redirect('/chat?user_id=' + recipient_id);
        }
        
        await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4)', 
            [sender_id, recipient_id, messageContent, messageType]
        );
        
        notificationService.notifyNewMessage(senderName, recipient_id).catch(e => console.error(e));
        
        res.redirect('/chat?user_id=' + recipient_id);
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: "Erro ao enviar mensagem." }); 
    }
});

module.exports = router;
