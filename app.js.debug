require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const flash = require('./middleware/flash'); 
const passport = require('passport');
const pool = require('./database/db'); 

// --- Ìª°Ô∏è 1. TIMEOUT GLOBAL (FAIL FAST) ---
// Se o banco travar, matamos a requisi√ß√£o em 10s com erro explicito.
app.use((req, res, next) => {
    res.setTimeout(10000, () => {
        console.error(`‚åõ TIMEOUT na rota: ${req.path}`);
        res.status(504).send('‚è±Ô∏è Erro: O servidor demorou muito para responder (Prov√°vel timeout de Banco de Dados).');
    });
    next();
});

// --- CONFIGURA√á√ÉO DE PROXY ---
app.set('trust proxy', 1);

// --- PASSPORT & VIEWS ---
require('./config/passport')(passport);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MIDDLEWARES BASE ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Ìª°Ô∏è 2. SESS√ÉO COM TRATAMENTO DE ERRO ---
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15 
});

// Importante: Logar erro do store para n√£o falhar silenciosamente
sessionStore.on('error', (err) => {
    console.error('Ì¥• ERRO NO SESSION STORE:', err.message);
});

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'secret_dev_key_123',
    resave: false,             
    saveUninitialized: false,  
    proxy: true,
    rolling: true,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        secure: isProduction, 
        httpOnly: true,
        sameSite: 'lax' 
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// --- Ìª°Ô∏è 3. TRAFFIC INSPECTOR (POSICIONADO CORRETAMENTE) ---
// Agora logamos DEPOIS que a sess√£o e o passport rodaram.
// Se n√£o aparecer no log, sabemos que travou na linha da session acima.
app.use((req, res, next) => {
    if (!req.path.match(/\.(css|js|png|jpg|ico|svg|woff)$/)) {
        const user = req.user ? `${req.user.email} (${req.user.role})` : 'Visitante';
        const authStatus = req.isAuthenticated() ? '‚úÖ Autenticado' : '‚ùå N√£o-Auth';
        console.log(`Ì∫¶ [${req.method}] ${req.path} | ${authStatus} | ${user}`);
    }
    next();
});

// --- VARI√ÅVEIS GLOBAIS ---
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// --- ROTAS ---
try {
    app.use('/', require('./routes/index'));
    app.use('/auth', require('./routes/auth'));
    app.use('/admin', require('./routes/admin'));
    app.use('/trainer', require('./routes/trainer'));
    app.use('/client', require('./routes/client'));
    app.use('/workouts', require('./routes/workouts'));
    app.use('/notifications', require('./routes/notifications'));
    app.use('/api', require('./routes/api'));
} catch (err) {
    console.error("‚ùå Erro fatal ao carregar rotas:", err);
}

// --- 404 & ERROR HANDLER ---
app.use((req, res) => {
    if (req.path.match(/\.(css|js|png|jpg|ico|map|json)$/)) {
        return res.status(404).end();
    }
    console.warn(`‚ö†Ô∏è 404: ${req.path}`);
    res.status(404).render('pages/error', { message: 'P√°gina n√£o encontrada' });
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`‚úÖ Servidor rodando na porta ${PORT}`);
        console.log(`Ìª°Ô∏è  Modo: ${process.env.NODE_ENV || 'development'}`);
    });
}
