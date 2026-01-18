require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./database/db'); 
const csrf = require('csurf');
const flash = require('connect-flash');

const app = express();

// Configuração para Vercel/Proxy
app.set('trust proxy', 1);

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Arquivos Estáticos e Body Parser
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessão
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'segredo_padrao_desenvolvimento',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

app.use(flash());

const csrfProtection = csrf();
app.use(csrfProtection);

// Middleware Global
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.user;
    res.locals.path = req.path;
    res.locals.query = req.query;
    res.locals.messages = req.flash();
    next();
});

// Importação das Rotas
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/client');
const trainerRoutes = require('./routes/trainer');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const workoutRoutes = require('./routes/workouts');
const articlesRoutes = require('./routes/articles'); // <--- NOVO

// Definição das Rotas
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/client', clientRoutes);
app.use('/trainer', trainerRoutes);
app.use('/admin', adminRoutes);
app.use('/chat', chatRoutes);
app.use('/workouts', workoutRoutes);
app.use('/articles', articlesRoutes); // <--- NOVO

// 404 Handler
app.use((req, res) => {
    res.status(404).render('pages/error', { 
        message: 'Página não encontrada',
        error: { status: 404 } 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
