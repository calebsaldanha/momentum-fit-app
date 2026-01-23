const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// View Principal
router.get('/', async (req, res) => {
    try {
        const userId = req.session.user.id;
        let usersToChat = [];
        
        // Lógica de quem pode falar com quem
        if (['admin', 'superadmin'].includes(req.session.user.role)) {
            // Admin vê todos
            const q = "SELECT id, name, role, profile_image FROM users WHERE id != $1 ORDER BY name";
            usersToChat = (await db.query(q, [userId])).rows;
        } else if (req.session.user.role === 'trainer') {
             // Treinador vê seus alunos
             const q = `
                SELECT u.id, u.name, u.role, u.profile_image 
                FROM users u 
                JOIN clients c ON u.id = c.user_id 
                WHERE u.trainer_id = $1`;
             usersToChat = (await db.query(q, [userId])).rows;
        } else {
            // Cliente vê Admins e seu Treinador
            const q = `
                SELECT id, name, role, profile_image 
                FROM users 
                WHERE role IN ('admin', 'superadmin') 
                OR id = (SELECT trainer_id FROM users WHERE id = $1)`;
            usersToChat = (await db.query(q, [userId])).rows;
        }

        res.render('pages/chat', { 
            users: usersToChat,
            currentUser: req.session.user 
        });
    } catch(e) {
        console.error('Erro Chat View:', e);
        res.render('pages/chat', { users: [], currentUser: req.session.user });
    }
});

// API: Listar Mensagens
router.get('/api/messages/:otherUserId', async (req, res) => {
    try {
        const myId = req.session.user.id;
        const otherId = req.params.otherUserId;
        
        const msgs = await db.query(`
            SELECT m.*, u.name as sender_name 
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE (sender_id = $1 AND receiver_id = $2) 
               OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC
        `, [myId, otherId]);
        
        res.json(msgs.rows);
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// API: Enviar Mensagem
router.post('/api/send', async (req, res) => {
    try {
        const { receiver_id, content } = req.body;
        if (!content || !receiver_id) return res.status(400).json({error: 'Dados inválidos'});

        await db.query(
            "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)", 
            [req.session.user.id, receiver_id, content]
        );
        res.json({ success: true });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao enviar' });
    }
});

module.exports = router;
