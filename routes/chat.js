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
            // Se for cliente, pega o trainer associado
            const trainerRes = await pool.query(`
                SELECT u.id, u.name, u.role, u.profile_image FROM users u 
                JOIN client_profiles cp ON cp.trainer_id = u.id 
                WHERE cp.user_id = $1
            `, [userId]);
            contacts = trainerRes.rows;
            
            // Se não tiver trainer, pega o admin para suporte
            if (contacts.length === 0) {
                const adminRes = await pool.query("SELECT id, name, role, profile_image FROM users WHERE role = 'superadmin'");
                contacts = adminRes.rows;
            }
        } else {
            // Se for Superadmin
            if (role === 'superadmin') {
                 const allUsers = await pool.query("SELECT id, name, role, profile_image FROM users WHERE id != $1 ORDER BY name ASC", [userId]);
                 contacts = allUsers.rows;
            } else {
                // Se for Trainer, pega seus alunos
                 const clientsRes = await pool.query(`
                    SELECT u.id, u.name, u.role, u.profile_image FROM users u 
                    JOIN client_profiles cp ON cp.user_id = u.id 
                    WHERE cp.trainer_id = $1
                    ORDER BY u.name ASC
                `, [userId]);
                 contacts = clientsRes.rows;
            }
        }

        res.render('pages/chat', { 
            title: 'Mensagens', 
            user: req.session.user, 
            chatUsers: contacts, // CORREÇÃO: Nome da variável ajustado para 'chatUsers'
            csrfToken: res.locals.csrfToken
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar chat.' });
    }
});

// API para buscar mensagens (JSON)
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
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// API para enviar mensagem (JSON)
router.post('/send', requireAuth, async (req, res) => {
    const { receiver_id, content } = req.body;
    const senderId = req.session.user.id;

    try {
        await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)",
            [senderId, receiver_id, content]
        );

        // NOTIFICAÇÃO DE EMAIL
        // Busca email do destinatário
        const receiverRes = await pool.query("SELECT email, name FROM users WHERE id = $1", [receiver_id]);
        if (receiverRes.rows.length > 0) {
            const receiver = receiverRes.rows[0];
            // Envia email em background (não espera para responder a request)
            sendNewMessageEmail(receiver.email, req.session.user.name, content, req.headers.host).catch(console.error);
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

module.exports = router;
