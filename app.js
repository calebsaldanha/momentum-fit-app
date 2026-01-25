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

// Arquivos Estáticos (Cache agressivo para performance)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d'
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuração de Sessão
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session',
        pruneSessionInterval: 60 * 60 * 24 // Limpar sessões expiradas a cada 24h
    }),
    secret: process.env.SESSION_SECRET || 'momentum_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' // Apenas HTTPS em prod
    }
}));

// Inicialização de Middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(flash);
app.use(contentLoader);

// Variáveis Globais
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.path = req.path;
    next();
});

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/client', require('./routes/client'));
app.use('/trainer', require('./routes/trainer'));
app.use('/admin', require('./routes/admin'));

// Tratamento de Erros
app.use((req, res) => {
    res.status(404).render('pages/error', { message: 'Página não encontrada', user: req.user, path: '' });
});

// SERVER STARTUP LOGIC
// Se for executado diretamente (node app.js), inicia o servidor.
// Se for importado (Vercel), apenas exporta a instância.
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`��� Server running locally on port ${PORT}`));
}

module.exports = app; // CRÍTICO: Exportar app para o Vercel
