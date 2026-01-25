// 1. CARREGAMENTO DE AMBIENTE (DEVE SER A PRIMEIRA LINHA)
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const path = require('path');
const flash = require('connect-flash');
const pool = require('./database/db'); // Agora seguro importar

const app = express();

// Configurações do Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuração de Sessão (Robusta para Prod)
app.set('trust proxy', 1); // Necessário para Vercel/Heroku (HTTPS)
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'secret_dev_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        secure: process.env.NODE_ENV === 'production', // Apenas HTTPS em prod
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Inicialização do Passport
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Middleware Global (Variáveis para Views)
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.path = req.path;
    res.locals.error_msg = req.flash('error');
    res.locals.success_msg = req.flash('success');
    res.locals.error = req.flash('error'); // Passport usa 'error'
    
    // CMS Mock (Fallback se DB falhar)
    res.locals.content = {
        hero_title: 'Transforme Potencial em Performance',
        hero_subtitle: 'A plataforma definitiva para personal trainers.',
    };
    next();
});

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/trainer', require('./routes/trainer'));
app.use('/trainer/workouts', require('./routes/workouts'));
app.use('/client', require('./routes/client'));
app.use('/payment', require('./routes/payment'));
// app.use('/api', require('./routes/api')); // API separada se necessário

// 404 Handler
app.use((req, res) => {
    res.status(404).render('pages/error', { 
        message: 'Página não encontrada', 
        error: {},
        title: '404'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`��� Servidor rodando na porta ${PORT}`));
