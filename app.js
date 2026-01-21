require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const flash = require('connect-flash');
const db = require('./database/db');

// --- VERCEL SPECIFIC: Trust Proxy ---
// Essencial para cookies seguros (https) atrás do proxy da Vercel
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Config Robust
const sessionStore = new pgSession({
    pool: db.pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15 // Limpa sessões expiradas a cada 15min
});

// Tratamento de erro na store de sessão para não crashar o app
sessionStore.on('error', function(err) {
    console.error('❌ ERRO NA SESSÃO (Connect-PG-Simple):', err);
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'dev_secret_key_change_in_prod',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        secure: process.env.NODE_ENV === 'production', // Secure apenas em produção (HTTPS)
        httpOnly: true,
        sameSite: 'lax'
    }
}));

app.use(flash());

// Middleware Global
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.user; 
    res.locals.messages = req.flash();
    res.locals.csrfToken = 'token-mock-safe'; 
    res.locals.path = req.path; // Para Sidebar Ativa
    next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/client', require('./routes/client'));
app.use('/trainer', require('./routes/trainer'));
app.use('/workouts', require('./routes/workouts'));
app.use('/articles', require('./routes/articles'));
app.use('/notifications', require('./routes/notifications'));
app.use('/api', require('./routes/api'));
app.use('/chat', require('./routes/chat'));

app.use((req, res) => {
    // Evita loop de redirecionamento se assets falharem
    if (req.url.includes('/css/') || req.url.includes('/images/')) {
        return res.status(404).end();
    }
    res.status(404).render('pages/error', { message: 'Página não encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
