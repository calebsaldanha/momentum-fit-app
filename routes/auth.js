const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const pool = require('../database/db');

// GET: Login Page
router.get('/login', (req, res) => {
    // Evita mostrar login se já estiver logado (previne loop parcial)
    if (req.isAuthenticated()) {
        return handleDashboardRedirect(req, res);
    }
    res.render('pages/login');
});

// POST: Login Logic
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { 
            console.error("Erro no Passport:", err);
            return next(err); 
        }
        if (!user) {
            req.flash('error_msg', info ? info.message : 'Credenciais inválidas');
            return res.redirect('/auth/login');
        }

        // LOGIN MANUAL COM CALLBACK
        req.logIn(user, (err) => {
            if (err) { 
                console.error("Erro no req.logIn:", err);
                return next(err); 
            }

            // ��� CORREÇÃO CRÍTICA DE RACE CONDITION ���
            // Força o salvamento da sessão no banco ANTES de redirecionar.
            // Sem isso, o navegador chega no dashboard antes do DB registrar o login.
            req.session.save((err) => {
                if (err) {
                    console.error("Erro ao salvar sessão:", err);
                    return next(err);
                }
                // Login com sucesso
                handleDashboardRedirect(req, res);
            });
        });
    })(req, res, next);
});

// GET: Register Page
router.get('/register', (req, res) => {
    if (req.isAuthenticated()) return handleDashboardRedirect(req, res);
    res.render('pages/register', { plan: req.query.plan });
});

// POST: Register Logic
router.post('/register', async (req, res) => {
    const { name, email, password, role, plan } = req.body;
    let errors = [];

    if (!name || !email || !password) errors.push({ msg: 'Preencha todos os campos' });
    if (password.length < 6) errors.push({ msg: 'A senha deve ter pelo menos 6 caracteres' });

    if (errors.length > 0) {
        return res.render('pages/register', { errors, name, email, role, plan });
    }

    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            errors.push({ msg: 'Email já cadastrado' });
            return res.render('pages/register', { errors, name, email, role, plan });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Define role padrão se não enviado
        const userRole = role || 'client'; 

        const newUser = await pool.query(
            'INSERT INTO users (name, email, password, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [name, email, hashedPassword, userRole]
        );

        const user = newUser.rows[0];

        // Auto-login após registro
        req.logIn(user, (err) => {
            if (err) {
                req.flash('success_msg', 'Conta criada, faça login.');
                return res.redirect('/auth/login');
            }
            req.session.save(() => {
                if (user.role === 'client') {
                    // Clientes novos vão para o form inicial
                    return res.redirect(\`/client/initial-form?plan=\${plan || ''}\`);
                }
                handleDashboardRedirect(req, res);
            });
        });

    } catch (err) {
        console.error(err);
        res.redirect('/auth/register');
    }
});

// GET/POST: Logout
router.all('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        // Destrói a sessão completamente para garantir
        req.session.destroy((err) => {
            res.clearCookie('connect.sid'); // Limpa o cookie do navegador
            res.redirect('/auth/login');
        });
    });
});

// Helper de Redirecionamento Centralizado
function handleDashboardRedirect(req, res) {
    const role = req.user.role;
    if (role === 'admin' || role === 'superadmin') return res.redirect('/admin/dashboard');
    if (role === 'trainer') return res.redirect('/trainer/dashboard');
    if (role === 'client') return res.redirect('/client/dashboard');
    return res.redirect('/');
}

module.exports = router;
