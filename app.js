require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./database/db'); // Seu pool pg
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();

// Configuração de View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware de Body Parser e Static
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Configuração de Sessão (Robusta)
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'momentum_secret_key_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    }
}));

// CSRF Protection (Ignorar em rotas de API/Webhook se necessário no futuro)
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// === MIDDLEWARE GLOBAL DE VARIÁVEIS ===
// Isso garante que o Header e Sidebar nunca quebrem
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.user;
    res.locals.csrfToken = req.csrfToken();
    res.locals.currentPage = req.path; // Usado para destacar menu ativo
    
    // Tratamento de mensagens flash (Query params simples por enquanto)
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
// app.use('/api', require('./routes/api')); // Se existir

// Rota de 404 (Página não encontrada)
app.use((req, res) => {
    res.status(404).render('pages/error', { 
        message: 'Página não encontrada', 
        error: { status: 404 },
        title: 'Erro 404'
    });
});

// Rota de 500 (Erro no Servidor)
app.use((err, req, res, next) => {
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
