const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// --- LOGIN ---
router.get('/login', (req, res) => {
    // Se já estiver logado, redireciona para o dashboard correto
    if (req.session.user) {
        if (req.session.user.role === 'admin') return res.redirect('/admin/dashboard');
        if (req.session.user.role === 'trainer') return res.redirect('/trainer/dashboard');
        return res.redirect('/client/dashboard');
    }
    res.render('pages/login', { csrfToken: req.csrfToken(), messages: req.flash() });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            // Login Sucesso: Salva na sessão
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            };

            // Atualiza último login (opcional, mas bom ter)
            await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

            req.flash('success', 'Bem-vindo de volta!');

            // Redirecionamento baseado na role
            if (user.role === 'admin' || user.role === 'superadmin') {
                return res.redirect('/admin/dashboard');
            } else if (user.role === 'trainer') {
                // Verifica se está aprovado
                const trainerCheck = await db.query('SELECT is_approved FROM trainers WHERE user_id = $1', [user.id]);
                if (trainerCheck.rows.length > 0 && !trainerCheck.rows[0].is_approved) {
                    return res.redirect('/pages/pending-trainer'); // Ou renderizar aviso
                }
                return res.redirect('/trainer/dashboard');
            } else {
                return res.redirect('/client/dashboard');
            }
        } else {
            req.flash('error', 'Email ou senha incorretos.');
            res.redirect('/auth/login');
        }
    } catch (err) {
        console.error('Erro no login:', err);
        req.flash('error', 'Erro interno no servidor.');
        res.redirect('/auth/login');
    }
});

// --- REGISTER ---
router.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('pages/register', { csrfToken: req.csrfToken(), messages: req.flash() });
});

router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    
    // Validação básica
    if (!name || !email || !password || !role) {
        req.flash('error', 'Todos os campos são obrigatórios.');
        return res.redirect('/auth/register');
    }

    try {
        // Verifica duplicidade
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            req.flash('error', 'Este email já está cadastrado.');
            return res.redirect('/auth/register');
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Transação para criar User + Perfil (Client ou Trainer)
        await db.query('BEGIN');

        const userResult = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, email, hashedPassword, role]
        );
        const userId = userResult.rows[0].id;

        if (role === 'client') {
            await db.query('INSERT INTO clients (user_id) VALUES ($1)', [userId]);
        } else if (role === 'trainer') {
            await db.query('INSERT INTO trainers (user_id, is_approved) VALUES ($1, false)', [userId]);
        }

        await db.query('COMMIT');

        req.flash('success', 'Conta criada com sucesso! Faça login.');
        res.redirect('/auth/login');

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Erro no registro:', err);
        req.flash('error', 'Erro ao criar conta. Tente novamente.');
        res.redirect('/auth/register');
    }
});

// --- LOGOUT (A CORREÇÃO PRINCIPAL) ---
// Usa GET porque o link é <a href="...">
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao encerrar sessão:', err);
            return res.redirect('/'); // Se falhar, manda pra home mesmo assim
        }
        res.clearCookie('connect.sid'); // Limpa o cookie da sessão
        res.redirect('/auth/login'); // Manda para login após sair
    });
});

module.exports = router;
