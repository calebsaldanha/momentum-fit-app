require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport'); // A biblioteca real
const path = require('path');
const flash = require('./middleware/flash');
const contentLoader = require('./middleware/contentloader'); // Middleware CMS
const pgSession = require('connect-pg-simple')(session);
const pool = require('./database/db'); // Pool do DB para a sessão

// Configurar Estratégia do Passport
require('./config/passport')(passport); // Passa a instância para configuração

const app = express();

// Configurações do Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuração de Sessão (Persistente no PostgreSQL)
app.use(session({
    store: new pgSession({
        pool: pool,                // Usa o pool existente
        tableName: 'session'       // Tabela criada no banco
    }),
    secret: process.env.SESSION_SECRET || 'momentum_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
    }
}));

// Auth Middleware (Inicialização)
app.use(passport.initialize());
app.use(passport.session());

// Flash Messages
app.use(flash);

// CMS Content Loader (Textos do Banco)
app.use(contentLoader);

// Variáveis Globais para Views
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.path = req.path;
    next();
});

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/client', require('./routes/client'));
app.use('/trainer', require('./routes/trainer'));
app.use('/admin', require('./routes/admin'));

// 404 Handler
app.use((req, res) => {
    res.status(404).render('pages/error', { 
        message: 'Página não encontrada',
        user: req.user,
        path: ''
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`��� Server running on port ${PORT}`));
