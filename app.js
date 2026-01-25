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

// Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d'
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuração de Sessão (Serverless Optimized)
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15 // 15 min
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'momentum_secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' 
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash);

// Middleware CMS
app.use(async (req, res, next) => {
    try {
        await contentLoader(req, res, next);
    } catch (err) {
        res.locals.getText = (p, s, k, f) => f;
        next();
    }
});

// Globais
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.path = req.path;
    next();
});

// Healthcheck
app.get('/api/health', (req, res) => res.status(200).json({status: 'ok'}));

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

// Local Start
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`��� Server running locally on port ${PORT}`));
}

module.exports = app;
