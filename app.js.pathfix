require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const flash = require('./middleware/flash'); 
const passport = require('passport');
const pool = require('./database/db'); 

// í»¡ï¸ 1. INFRAESTRUTURA
app.set('trust proxy', 1);
require('./config/passport')(passport);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// í»¡ï¸ 2. SESSÃƒO ROBUSTA
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15
});

sessionStore.on('error', (err) => console.error('í´¥ Session Store Error:', err.message));

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

// í»¡ï¸ 3. DIAGNÃ“STICO DE TRÃFEGO
app.use((req, res, next) => {
    if (!req.path.match(/\.(css|js|png|jpg|ico|svg|woff)$/)) {
        console.log(`íº¦ [${req.method}] ${req.path}`);
        console.log(`   í±¤ Auth: ${req.isAuthenticated()} | User: ${req.user ? req.user.email : 'Visitante'}`);
    }
    next();
});

// VARIÃVEIS GLOBAIS
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// í»¡ï¸ 4. ROTAS (ORDEM CRÃTICA - ESPECÃFICAS PRIMEIRO)
try {
    console.log("í³‚ Carregando rotas...");
    
    // Rotas de API e Auth tÃªm prioridade absoluta
    app.use('/auth', require('./routes/auth'));
    app.use('/api', require('./routes/api'));
    
    // Rotas de PainÃ©is
    app.use('/admin', require('./routes/admin'));
    app.use('/trainer', require('./routes/trainer'));
    app.use('/client', require('./routes/client'));
    
    // Rotas de Funcionalidades
    app.use('/workouts', require('./routes/workouts'));
    app.use('/notifications', require('./routes/notifications'));
    
    // âš ï¸ ROTA GENÃ‰RICA (INDEX) DEVE SER A ÃšLTIMA
    // Se ela vier antes, rouba as requisiÃ§Ãµes das outras.
    app.use('/', require('./routes/index'));
    
    console.log("âœ… Rotas carregadas com sucesso.");
} catch (err) {
    console.error("âŒ ERRO FATAL NAS ROTAS:", err);
}

// í»¡ï¸ 5. ROTA DE DEBUG (TESTE DE VIDA)
app.get('/health', (req, res) => res.send('OK - Server is running'));

// 404 HANDLER
app.use((req, res) => {
    if (req.path.match(/\.(css|js|png|jpg|ico|map|json)$/)) return res.status(404).end();
    console.warn(`âš ï¸ 404 Real: ${req.path}`);
    res.status(404).render('pages/error', { message: 'PÃ¡gina nÃ£o encontrada' });
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`âœ… Servidor ONLINE na porta ${PORT}`);
    });
}
