const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
require('dotenv').config();

// Configurações de Sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave-secreta-padrao',
    resave: false,
    saveUninitialized: false, // Alterado para false para evitar sessões vazias
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Secure apenas em produção (HTTPS)
        maxAge: 1000 * 60 * 60 * 24 // 1 dia
    }
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// IMPORTANTE: Correção para servir arquivos estáticos na Vercel
app.use(express.static(path.join(__dirname, 'public')));

// IMPORTANTE: Correção para localizar as views na Vercel
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rotas
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/client'); // Dashboard Cliente
const adminRoutes = require('./routes/admin'); // Dashboard Admin
const workoutsRoutes = require('./routes/workouts');
const chatRoutes = require('./routes/chat');
const articlesRoutes = require('./routes/articles');
const notificationsRoutes = require('./routes/notifications');
const trainerRoutes = require('./routes/trainer');
const superAdminRoutes = require('./routes/superadmin');
const apiRoutes = require('./routes/api');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/client', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/workouts', workoutsRoutes);
app.use('/chat', chatRoutes);
app.use('/articles', articlesRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/trainer', trainerRoutes);
app.use('/superadmin', superAdminRoutes);
app.use('/api', apiRoutes);

// Tratamento de Erro 404
app.use((req, res, next) => {
    res.status(404).render('pages/error', { 
        message: 'Página não encontrada',
        error: { status: 404 }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
