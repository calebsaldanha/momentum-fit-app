const express = require('express');
const session = require('express-session');
const path = require('path');
const flash = require('connect-flash');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./database/db');
const app = express();

// Configuração da View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para Arquivos Estáticos (CSS, Imagens, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de Parsing (CORREÇÃO CRÍTICA AQUI)
// Necessário para formulários tradicionais
app.use(express.urlencoded({ extended: true }));
// Necessário para envios via fetch/AJAX (Botão Salvar Treino)
app.use(express.json());

// Configuração da Sessão
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'momentum_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 dias
}));

// Flash Messages e Variáveis Globais
app.use(flash());
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.messages = req.flash();
    res.locals.path = req.path;
    // Helper para formatar data nas views
    res.locals.formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };
    next();
});

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/workouts', require('./routes/workouts')); // Rotas de Treino corrigidas
app.use('/client', require('./routes/client'));
app.use('/trainer', require('./routes/trainer'));
app.use('/notifications', require('./routes/notifications'));
app.use('/chat', require('./routes/chat'));
app.use('/articles', require('./routes/articles')); // Rotas de Artigos corrigidas
app.use('/superadmin', require('./routes/superadmin'));
app.use('/api', require('./routes/api'));

// Rota 404 (Página de Erro)
app.use((req, res) => {
    res.status(404).render('pages/error', { message: 'Página não encontrada.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
