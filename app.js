require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const flash = require('./middleware/flash');
const passport = require('passport');
const pool = require('./database/db'); 

// --- CONFIGURAÇÃO CRÍTICA PARA VERCEL/PROXY ---
// Necessário para cookies funcionarem atrás de load balancers (Vercel, Heroku, AWS)
app.set('trust proxy', 1);

// Configuração do Passport
require('./config/passport')(passport);

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body Parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'public')));

// --- SESSÃO E AUTH ---
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session', // A tabela que vamos criar agora
        createTableIfMissing: true // Tenta criar automaticamente, mas vamos forçar no script
    }),
    secret: process.env.SESSION_SECRET || 'secret_dev_key_123',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Importante para SSL
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        secure: process.env.NODE_ENV === 'production', // true em produção (HTTPS)
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Ajuste para cross-site cookies se necessário
    }
}));

// Inicializa Passport
app.use(passport.initialize());
app.use(passport.session());

// Flash Messages
app.use(flash());

// Variáveis Globais
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// --- ROTAS ---
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/trainer', require('./routes/trainer'));
app.use('/client', require('./routes/client'));
app.use('/workouts', require('./routes/workouts'));
app.use('/notifications', require('./routes/notifications'));
app.use('/api', require('./routes/api'));

// Rota 404
app.use((req, res) => {
    res.status(404).render('pages/error', { message: 'Página não encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
