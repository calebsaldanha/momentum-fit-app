require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
// Middleware seguro local (criado no passo anterior)
const flash = require('./middleware/flash'); 
const passport = require('passport');
const pool = require('./database/db'); 

console.log('��� Inicializando Configuração da Aplicação...');

// --- 1. CONFIGURAÇÃO DE PROXY (OBRIGATÓRIO PARA VERCEL) ---
app.set('trust proxy', 1);

// --- 2. PASSPORT & VIEWS ---
require('./config/passport')(passport);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- 3. MIDDLEWARES BASE ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 4. SESSÃO ROBUSTA (BLINDADA CONTRA QUEDA DO DB) ---
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15 // 15 min
});

// Evita crash se o banco cair na Vercel
sessionStore.on('error', function(error) {
    console.error('��� Erro na Session Store (Ignorado para manter app vivo):', error.message);
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'secret_dev_key_123',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Vital para HTTPS na Vercel
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        secure: process.env.NODE_ENV === 'production', // true na Vercel
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// --- 5. VARIÁVEIS GLOBAIS ---
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// --- 6. ROTAS ---
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
    console.error("❌ Erro fatal ao carregar rotas:", err);
}

// Rota 404
app.use((req, res) => {
    res.status(404).render('pages/error', { message: 'Página não encontrada' });
});

// --- 7. EXPORTAÇÃO CRÍTICA PARA VERCEL ---
// Isso permite que o api/index.js receba a app sem tentar abrir porta
module.exports = app;

// --- 8. INICIALIZAÇÃO CONDICIONAL (APENAS LOCAL) ---
// O if abaixo garante que o app.listen SÓ roda se você chamar 'node app.js'
// Na Vercel, isso é IGNORADO (correto), pois a Vercel já injeta o servidor.
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    
    // Verificação de DB apenas no boot local para feedback visual
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('❌ ERRO DB (Local):', err.message);
        } else {
            console.log('✅ DB Conectado (Local).');
        }
        
        app.listen(PORT, () => {
            console.log(`✅ Servidor Local rodando na porta ${PORT}`);
        });
    });
}
