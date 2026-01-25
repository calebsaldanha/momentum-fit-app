require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const flash = require('./middleware/flash');
const contentLoader = require('./middleware/contentloader');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./database/db');

// Configurar Passport
require('./config/passport')(passport);

const app = express();

// Configurações do Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Arquivos Estáticos com Cache Control
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: false
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- CONFIGURAÇÃO DE SESSÃO ROBUSTA ---
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true, // Tenta criar se não existir
    pruneSessionInterval: 60 * 15 // 15 min em vez de 24h para serverless (menos processos de fundo)
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'fallback_secret_dev_only',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Mantém sessão viva enquanto navega
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        httpOnly: true,
        // Secure auto-detecta: true em HTTPS (Vercel), false em localhost
        secure: process.env.NODE_ENV === 'production' 
    }
}));

// Inicialização
app.use(passport.initialize());
app.use(passport.session());
app.use(flash);

// Middleware de Log para Debug (Verificar se requisição chega)
app.use((req, res, next) => {
    if (req.url !== '/favicon.ico') {
        // console.log(`[REQUEST] ${req.method} ${req.url}`); // Descomente se precisar debugar rotas
    }
    next();
});

// Middleware CMS (Com Fallback)
app.use(async (req, res, next) => {
    try {
        await contentLoader(req, res, next);
    } catch (err) {
        console.error("CMS Loader Failed:", err.message);
        res.locals.getText = (p, s, k, f) => f; // Fallback function
        next();
    }
});

// Globais
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.path = req.path;
    next();
});

// Healthcheck Route (Para monitoramento externo)
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'ok', db: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', db: err.message });
    }
});

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/client', require('./routes/client'));
app.use('/trainer', require('./routes/trainer'));
app.use('/admin', require('./routes/admin'));

// 404
app.use((req, res) => {
    res.status(404).render('pages/error', { message: 'Página não encontrada', user: req.user, path: '' });
});

// Handler Local
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`��� Server running locally on port ${PORT}`));
}

module.exports = app;
