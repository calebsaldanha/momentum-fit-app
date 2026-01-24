require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const flash = require('./middleware/flash'); 
const passport = require('passport');
const pool = require('./database/db'); 

// ���️ 1. CONFIANÇA NO PROXY (CRÍTICO PARA VERCEL)
app.set('trust proxy', 1);

// ���️ 2. CONFIGURAÇÕES BÁSICAS
require('./config/passport')(passport);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ��️ 3. SESSÃO BLINDADA (SEM RACE CONDITIONS)
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15
});

sessionStore.on('error', (err) => {
    console.error('�� CRÍTICO: Erro no Store de Sessão:', err.message);
});

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'secret_dev_key_123',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Obrigatório para cookies funcionarem atrás do proxy da Vercel
    rolling: true,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        secure: isProduction, // HTTPS em produção
        httpOnly: true,
        sameSite: 'lax' // Melhor equilíbrio entre segurança e usabilidade
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// ���️ 4. LOGGER DIAGNÓSTICO (CORRIGIDO)
app.use((req, res, next) => {
    if (!req.path.match(/\.(css|js|png|jpg|ico|svg|woff)$/)) {
        // Correção aqui: Template strings limpas
        const proto = req.headers['x-forwarded-proto'] || req.protocol;
        const isSecure = req.secure || proto === 'https';
        const user = req.user ? `${req.user.email} [${req.user.role}]` : 'Visitante';
        
        console.log(`��� [${req.method}] ${req.path}`);
        console.log(`   ��� Auth: ${req.isAuthenticated()} | User: ${user}`);
        
        // Debug de Cookie apenas se falhar
        if (isProduction && !isSecure) {
            console.warn("⚠️ ALERTA: Conexão insegura detectada em Prod. Cookie secure pode falhar.");
        }
    }
    next();
});

// VARIÁVEIS GLOBAIS
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// ROTAS
try {
    app.use('/', require('./routes/index'));
    app.use('/auth', require('./routes/auth'));
    app.use('/admin', require('./routes/admin'));
    app.use('/trainer', require('./routes/trainer'));
    app.use('/client', require('./routes/client'));
    app.use('/workouts', require('./routes/workouts'));
    app.use('/notifications', require('./routes/notifications'));
    app.use('/api', require('./routes/api'));
} catch (err) {
    console.error("❌ FALHA AO CARREGAR ROTAS:", err);
}

// 404 HANDLER
app.use((req, res) => {
    if (req.path.match(/\.(css|js|png|jpg|ico|map|json)$/)) {
        return res.status(404).end();
    }
    console.warn(`⚠️ 404 Detectado: ${req.path}`);
    res.status(404).render('pages/error', { message: 'Página não encontrada' });
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Servidor ONLINE na porta ${PORT}`);
    });
}
