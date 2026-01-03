const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewMessageEmail } = require('../utils/emailService');

const requireAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/auth/login');
};

// Rota Principal do Chat
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const role = req.session.user.role;
        let contacts = [];

        // 1. BUSCAR LISTA DE CONTATOS (Lógica Baseada no Perfil)
        if (role === 'client') {
            // Cliente vê seu Treinador
            const trainerRes = await pool.query(`
                SELECT u.id, u.name, u.role, u.profile_image FROM users u 
                JOIN client_profiles cp ON cp.trainer_id = u.id 
                WHERE cp.user_id = $1
            `, [userId]);
            contacts = trainerRes.rows;
            
            // Se não tiver treinador, vê o Admin (Suporte)
            if (contacts.length === 0) {
                const adminRes = await pool.query("SELECT id, name, role, profile_image FROM users WHERE role = 'superadmin'");
                contacts = adminRes.rows;
            }
        } else if (role === 'superadmin') {
            // Superadmin vê TODOS (exceto ele mesmo)
            const allUsers = await pool.query("SELECT id, name, role, profile_image FROM users WHERE id != $1 ORDER BY name ASC", [userId]);
            contacts = allUsers.rows;
        } else {
            // Treinador vê seus Alunos
            const clientsRes = await pool.query(`
                SELECT u.id, u.name, u.role, u.profile_image FROM users u 
                JOIN client_profiles cp ON cp.user_id = u.id 
                WHERE cp.trainer_id = $1
                ORDER BY u.name ASC
            `, [userId]);
            contacts = clientsRes.rows;
        }

        // 2. LOGICA DE SELEÇÃO DE USUÁRIO (activeChat)
        let activeChat = null;
        let messages = [];

        // Verifica se clicou em alguém (?user_id=XY)
        if (req.query.user_id) {
            const targetId = req.query.user_id;

            // Busca dados do usuário selecionado
            const targetRes = await pool.query("SELECT id, name, profile_image FROM users WHERE id = $1", [targetId]);
            
            if (targetRes.rows.length > 0) {
                activeChat = targetRes.rows[0];

                // Busca histórico de mensagens
                const msgRes = await pool.query(`
                    SELECT * FROM messages 
                    WHERE (sender_id = $1 AND receiver_id = $2) 
                       OR (sender_id = $2 AND receiver_id = $1) 
                    ORDER BY created_at ASC
                `, [userId, targetId]);
                messages = msgRes.rows;

                // Marca mensagens como lidas
                await pool.query("UPDATE messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2", [targetId, userId]);
            }
        }

        // 3. RENDERIZA A TELA
        res.render('pages/chat', { 
            title: 'Mensagens', 
            user: req.session.user, 
            chatUsers: contacts,  // Lista lateral
            activeChat: activeChat, // Usuário ativo (cabeçalho do chat)
            messages: messages,   // Histórico
            csrfToken: res.locals.csrfToken
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar chat.' });
    }
});

// API: Buscar mensagens (JSON) - Usado para polling ou atualização dinâmica se necessário
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

// API: Enviar mensagem
router.post('/send', requireAuth, async (req, res) => {
    const { recipient_id, content } = req.body; // Nota: View usa 'recipient_id' no form, mas JSON pode usar 'receiver_id'
    const senderId = req.session.user.id;
    
    // Tratamento para upload de arquivo (se houver lógica futura)
    // Por enquanto foca em texto
    
    try {
        await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)",
            [senderId, recipient_id, content]
        );

        // NOTIFICAÇÃO DE EMAIL
        const receiverRes = await pool.query("SELECT email, name FROM users WHERE id = $1", [recipient_id]);
        if (receiverRes.rows.length > 0) {
            const receiver = receiverRes.rows[0];
            sendNewMessageEmail(receiver.email, req.session.user.name, content, req.headers.host).catch(console.error);
        }

        // Redireciona de volta para o chat mantendo o usuário aberto
        res.redirect(`/chat?user_id=${recipient_id}`);
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao enviar mensagem.' });
    }
});

module.exports = router;
