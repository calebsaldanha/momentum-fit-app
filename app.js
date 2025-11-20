require("dotenv").config();
// app.js (Configuração Corrigida para Vercel/Production)

const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool: pgPool, initDb } = require('./database/db');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const csurf = require('csurf');

const app = express();

// 1. CONFIGURAÇÃO CRÍTICA PARA VERCEL (Trust Proxy)
// Isso permite que o Express saiba que está rodando atrás do proxy seguro da Vercel
app.set('trust proxy', 1); 

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.use(cookieParser());

// 2. CONFIGURAÇÃO DA SESSÃO
app.use(session({
    store: new pgSession({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: true // Tenta criar a tabela se não existir
    }),
    secret: process.env.SESSION_SECRET || 'momentum-fit-secret',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Importante para cookies seguros em proxy
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        secure: process.env.NODE_ENV === 'production', // True em produção (HTTPS)
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Melhora compatibilidade
        httpOnly: true
    }
}));

// 3. PROTEÇÃO CSRF
const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

// Middleware para variáveis globais
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.isAuthenticated = !!req.session.user;
    res.locals.user = req.session.user || { role: 'guest' };
    next();
});

// Rotas
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
    if (err.code !== 'EBADCSRFTOKEN') {
        console.error(err.stack);
        return res.status(500).render('pages/error', {
            title: 'Erro no Servidor',
            message: 'Algo inesperado aconteceu.'
        });
    }
    res.status(403).render('pages/error', {
        title: 'Acesso Negado',
        message: 'Sessão expirada ou token inválido. Tente recarregar a página.'
    });
});

app.use((req, res) => {
    res.status(404).render('pages/error', { 
        title: '404', 
        message: 'Página não encontrada.' 
    });
});

module.exports = app;

// Inicialização Local
const port = process.env.PORT || 3000;
const startServer = async () => {
  try {
    await initDb();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ Falha ao iniciar:", error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'production') {
    startServer();
}
