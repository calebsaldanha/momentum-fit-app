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

// Confie no proxy se estiver no Vercel/Heroku/Render
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Configuração de Sessão Robusta
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    store: new pgSession({ pool: pgPool, tableName: 'session', createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'momentum-fit-secret-dev-key',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        secure: isProduction, // Só true se for HTTPS/Prod
        sameSite: isProduction ? 'none' : 'lax', // Lax para localhost
        httpOnly: true
    }
}));

const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

// Middleware Global de Variáveis
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.isAuthenticated = !!req.session.user;
    res.locals.user = req.session.user || null;
    res.locals.title = 'Momentum Fit';
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
app.use('/api', require('./routes/api'));     // Rota API (Uploads/Notificações)
app.use('/trainer', require('./routes/trainer')); // Rota Trainer (Perfil Pendente)

// Tratamento de Erros
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('pages/error', { title: 'Erro de Segurança', message: 'Token de sessão inválido ou expirado. Tente recarregar a página.' });
    }
    console.error(err.stack);
    res.status(500).render('pages/error', { title: 'Erro no Servidor', message: 'Erro interno no sistema.' });
});

// Inicialização
initDb().then(() => {
    console.log('Database connected.');
}).catch(err => console.error('DB Init Error:', err));

module.exports = app;

const port = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(port, () => console.log(`Servidor rodando em http://localhost:${port}`));
}
