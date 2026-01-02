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

// Configurações Vercel
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.static(path.join(process.cwd(), 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Configuração de Sessão
const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
    store: new pgSession({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: false, // CRÍTICO: Não tenta criar tabela no boot (evita timeout)
        pruneSessionInterval: 60 * 15,
        errorLog: (err) => console.error('⚠️ Erro Session Store:', err.message)
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        secure: isProduction, 
        sameSite: 'lax',
        httpOnly: true
    }
}));

const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

// Middleware Global (Resiliente a falhas de DB)
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    // Verifica sessão com segurança
    res.locals.isAuthenticated = req.session && !!req.session.user;
    res.locals.user = (req.session && req.session.user) ? req.session.user : null;
    res.locals.title = 'Momentum Fit';
    res.locals.notifications = [];
    res.locals.unreadCount = 0;
    next();
});

// Middleware de Notificações
app.use(require('./middleware/notifications'));

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
    console.error("❌ Erro Global:", err.message);
    
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('pages/error', { title: 'Erro de Segurança', message: 'Sessão expirada. Atualize a página.' });
    }
    
    // Tratamento específico para Timeout do Banco
    if (err.message && (err.message.includes('timeout') || err.message.includes('Client has already been released'))) {
        if (req.accepts('html')) {
             return res.status(503).render('pages/error', { 
                title: 'Iniciando Sistema', 
                message: 'O sistema está acordando. Por favor, aguarde 5 segundos e atualize a página.' 
            });
        }
    }

    const status = err.status || 500;
    if (req.accepts('html')) {
        res.status(status).render('pages/error', { title: 'Erro', message: 'Ocorreu um erro interno.' });
    } else {
        res.status(status).json({ error: 'Erro interno do servidor' });
    }
});

// Inicializa DB em background (Não bloqueia o servidor de subir)
initDb().catch(e => console.error("Aviso InitDb:", e.message));

module.exports = app;

if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Rodando na porta ${port}`));
}
