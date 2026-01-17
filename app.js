require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./database/db'); // Seu pool pg
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();

// --- CORREÇÃO CRÍTICA PARA VERCEL ---
// Necessário para que cookies 'secure' funcionem atrás do proxy da Vercel
app.set('trust proxy', 1); 

// Configuração de View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware de Body Parser e Static
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Configuração de Sessão (Otimizada)
app.use(session({
    store: new pgSession({
        pool: pool, // Usa a conexão do db.js
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'momentum_secret_key_change_me_immediately',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        // Secure DEVE ser true em produção (https), false localmente (http)
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        sameSite: 'lax' // Melhor compatibilidade com redirects
    }
}));

// CSRF Protection
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// === MIDDLEWARE GLOBAL DE VARIÁVEIS ===
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.user;
    res.locals.csrfToken = req.csrfToken();
    res.locals.currentPage = req.path;
    
    res.locals.success = req.query.success || null;
    res.locals.error = req.query.error || null;
    
    next();
});

// === ROTAS ===
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/client', require('./routes/client'));
app.use('/trainer', require('./routes/trainer'));
app.use('/admin', require('./routes/admin'));
app.use('/workouts', require('./routes/workouts'));
app.use('/articles', require('./routes/articles'));
// app.use('/api', require('./routes/api'));

// Rota de 404
app.use((req, res) => {
    res.status(404).render('pages/error', { 
        message: 'Página não encontrada', 
        error: { status: 404 },
        title: 'Erro 404'
    });
});

// Rota de 500
app.use((err, req, res, next) => {
    // Ignora erro CSRF (apenas redireciona)
    if (err.code === 'EBADCSRFTOKEN') {
        return res.redirect('/auth/login?error=Sessão expirada, tente novamente.');
    }
    
    console.error('SERVER ERROR:', err);
    res.status(500).render('pages/error', { 
        message: 'Algo deu errado no servidor.', 
        error: { status: 500 },
        title: 'Erro Interno'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
