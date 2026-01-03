const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewMessageEmail } = require('../utils/emailService');

const requireAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/auth/login');
};

router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const role = req.session.user.role;
        let contacts = [];

        if (role === 'client') {
            // Se for cliente, pega o trainer
            const trainerRes = await pool.query(`
                SELECT u.id, u.name, u.role FROM users u 
                JOIN client_profiles cp ON cp.trainer_id = u.id 
                WHERE cp.user_id = $1
            `, [userId]);
            contacts = trainerRes.rows;
            // Se não tiver trainer, pega o admin? (Opcional, mas simplifica)
             if (contacts.length === 0) {
                const adminRes = await pool.query("SELECT id, name, role FROM users WHERE role = 'superadmin'");
                contacts = adminRes.rows;
            }
        } else {
            // Se for trainer/admin, pega todos os clientes associados
            const clientsRes = await pool.query(`
                SELECT u.id, u.name, u.role FROM users u 
                JOIN client_profiles cp ON cp.user_id = u.id 
                WHERE cp.trainer_id = $1 OR $2 = 'superadmin'
            `, [userId, role]); // Superadmin vê todos se quiser, mas aqui simplificado
             // Se for superadmin, talvez queira ver todos. Vou manter simples.
             if (role === 'superadmin') {
                 const allUsers = await pool.query("SELECT id, name, role FROM users WHERE id != $1", [userId]);
                 contacts = allUsers.rows;
             } else {
                 contacts = clientsRes.rows;
             }
        }

        res.render('pages/chat', { 
            title: 'Mensagens', 
            user: req.session.user, 
            contacts: contacts,
            csrfToken: res.locals.csrfToken
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar chat.' });
    }
});

// API para buscar mensagens
router.get('/messages/:contactId', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const contactId = req.params.contactId;
        
        const msgs = await pool.query(`
            SELECT * FROM messages 
            WHERE (sender_id = $1 AND receiver_id = $2) 
               OR (sender_id = $2 AND receiver_id = $1) 
            ORDER BY created_at ASC
        `, [userId, contactId]);
        
        res.json(msgs.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// API para enviar mensagem
router.post('/send', requireAuth, async (req, res) => {
    const { receiver_id, content } = req.body;
    const senderId = req.session.user.id;

    try {
        await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)",
            [senderId, receiver_id, content]
        );

        // NOTIFICAÇÃO: Email para o receptor
        const receiverRes = await pool.query("SELECT email, name FROM users WHERE id = $1", [receiver_id]);
        if (receiverRes.rows.length > 0) {
            const receiver = receiverRes.rows[0];
            sendNewMessageEmail(receiver.email, req.session.user.name, content, req.headers.host).catch(console.error);
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

module.exports = router;
