const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// View do Chat
router.get('/', async (req, res) => {
    try {
        const userId = req.session.user.id;
        let usersToChat = [];
        
        if (req.session.user.role === 'admin' || req.session.user.role === 'superadmin') {
            const allUsers = await db.query("SELECT id, name, role, profile_image FROM users WHERE id != $1 ORDER BY name", [userId]);
            usersToChat = allUsers.rows;
        } else if (req.session.user.role === 'trainer') {
             const myClients = await db.query("SELECT u.id, u.name, u.role, u.profile_image FROM users u JOIN clients c ON u.id = c.user_id WHERE u.trainer_id = $1", [userId]);
             usersToChat = myClients.rows;
        } else {
            const staff = await db.query("SELECT id, name, role, profile_image FROM users WHERE role IN ('admin', 'superadmin') OR id = (SELECT trainer_id FROM users WHERE id = $1)", [userId]);
            usersToChat = staff.rows;
        }

        res.render('pages/chat', { 
            users: usersToChat,
            currentUser: req.session.user 
        });
    } catch(e) {
        console.error(e);
        res.render('pages/chat', { users: [], currentUser: req.session.user });
    }
});

// API: Mensagens
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
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// API: Enviar
router.post('/api/send', async (req, res) => {
    try {
        const { receiver_id, content } = req.body;
        await db.query(
            "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)", 
            [req.session.user.id, receiver_id, content]
        );
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Erro ao enviar' });
    }
});

module.exports = router;
