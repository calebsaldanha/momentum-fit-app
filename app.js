require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./database/db'); 
const csrf = require('csurf');
const flash = require('connect-flash');

const app = express();

// --- CORREÇÃO IMPORTANTE PARA VERCEL/PRODUÇÃO ---
// Permite que cookies seguros (https) funcionem atrás de proxies
app.set('trust proxy', 1); 

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuração da Sessão
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true // Garante que a tabela exista
    }),
    secret: process.env.SESSION_SECRET || 'segredo_padrao_desenvolvimento',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        httpOnly: true,
        // Secure true apenas em produção
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' // Importante para navegação segura
    }
}));

app.use(flash());

// Middleware CSRF
const csrfProtection = csrf();
app.use(csrfProtection);

// Variáveis Globais (User, CSRF, Path)
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.user = req.session.user || null;
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

// Definição das Rotas
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/client', clientRoutes);
app.use('/trainer', trainerRoutes);
app.use('/admin', adminRoutes);
app.use('/chat', chatRoutes);
app.use('/workouts', workoutRoutes);

// Tratamento de Erro 404
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
