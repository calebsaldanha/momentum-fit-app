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

app.set('trust proxy', 1); 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Configuração da Sessão (Deve vir antes do CSRF e das rotas)
app.use(session({
    store: new pgSession({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'momentum-fit-secret',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        httpOnly: true
    }
}));

const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

// Middleware para variáveis globais (Deve vir após a sessão)
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.isAuthenticated = !!req.session.user;
    res.locals.user = req.session.user || null;
    res.locals.success_msg = null;
    res.locals.error_msg = null;
    next();
});

// Definição de Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/client', require('./routes/client'));
app.use('/trainer', require('./routes/trainer'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));
app.use('/chat', require('./routes/chat'));
app.use('/articles', require('./routes/articles'));
app.use('/workouts', require('./routes/workouts'));
app.use('/superadmin', require('./routes/superadmin'));

// Tratamento de Erros
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('pages/error', { title: 'Acesso Negado', message: 'Sessão expirada ou token inválido.' });
    }
    console.error(err.stack);
    res.status(500).render('pages/error', { title: 'Erro no Servidor', message: 'Algo inesperado aconteceu.' });
});

// Catch 404
app.use((req, res) => {
    res.status(404).render('pages/error', { title: '404', message: 'Página não encontrada.' });
});

// Inicialização do Banco de Dados
initDb().catch(err => console.error("Falha ao inicializar banco de dados:", err));

module.exports = app;

const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => console.log(`Servidor rodando em http://localhost:${port}`));
}
