require("dotenv").config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool: pgPool, initDb } = require('./database/db');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const csurf = require('csurf');

const app = express();

// Configurações Essenciais para Vercel
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
// path.join é CRUCIAL para a Vercel encontrar a pasta views
app.set('views', path.join(__dirname, 'views'));

// Servir estáticos com caminho absoluto
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Configuração de Sessão
const isProduction = process.env.NODE_ENV === 'production';
const sessionStore = new pgSession({ 
    pool: pgPool, 
    tableName: 'session', 
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        secure: isProduction, // HTTPS obrigatório em prod
        sameSite: isProduction ? 'none' : 'lax',
        httpOnly: true
    }
}));

const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

// Middleware Global
app.use(async (req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.isAuthenticated = !!req.session.user;
    res.locals.user = req.session.user || null;
    res.locals.title = 'Momentum Fit';
    
    // Evitar query de notificação se não logado para poupar DB
    if (req.session.user) {
        try {
            const notifRes = await pgPool.query('SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC LIMIT 5', [req.session.user.id]);
            res.locals.notifications = notifRes.rows;
            const countRes = await pgPool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [req.session.user.id]);
            res.locals.unreadCount = countRes.rows[0].count;
        } catch (e) {
            res.locals.notifications = [];
            res.locals.unreadCount = 0;
        }
    } else {
        res.locals.notifications = [];
        res.locals.unreadCount = 0;
    }
    next();
});

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/client', require('./routes/client'));
app.use('/admin', require('./routes/admin'));
app.use('/workouts', require('./routes/workouts'));
app.use('/chat', require('./routes/chat'));
app.use('/superadmin', require('./routes/superadmin'));
app.use('/articles', require('./routes/articles'));
app.use('/api', require('./routes/api'));
app.use('/trainer', require('./routes/trainer'));
app.use('/notifications', require('./routes/notifications'));

// Tratamento de Erro Global
app.use((err, req, res, next) => {
    console.error("Erro Global:", err);
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('pages/error', { title: 'Erro de Segurança', message: 'Sessão expirada. Atualize a página.' });
    }
    const status = err.status || 500;
    // Renderiza página de erro se possível, senão JSON
    if (req.accepts('html')) {
        res.status(status).render('pages/error', { title: 'Erro', message: 'Ocorreu um erro interno.' });
    } else {
        res.status(status).json({ error: 'Erro interno do servidor' });
    }
});

// Inicializa DB sem travar o servidor (Serverless)
initDb().catch(e => console.error("Erro ao init DB:", e));

module.exports = app;

if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Rodando na porta ${port}`));
}
