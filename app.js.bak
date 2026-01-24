require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const flash = require('./middleware/flash'); 
const passport = require('passport');
const pool = require('./database/db'); 

// --- TRAFFIC INSPECTOR (DEBUG) ---
// Loga apenas requisições reais para entender o "loop"
app.use((req, res, next) => {
    // Ignora logs de assets comuns para não poluir, a menos que seja erro
    if (!req.path.match(/\.(css|js|png|jpg|ico|svg)$/)) {
        console.log(`��� [REQ] ${req.method} ${req.path}`);
    }
    next();
});

// --- CONFIGURAÇÃO DE PROXY ---
app.set('trust proxy', 1);

// --- PASSPORT & VIEWS ---
require('./config/passport')(passport);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MIDDLEWARES BASE ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir estáticos ANTES da sessão para performance
app.use(express.static(path.join(__dirname, 'public')));

// --- SESSÃO E AUTH ---
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15 
});

// Proteção contra queda do DB
sessionStore.on('error', function(error) {
    console.error('��� Erro na Session Store:', error.message);
});

// Configuração Inteligente de Cookie
const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'secret_dev_key_123',
    resave: false,             // IMPORTANTE: false evita loops de escrita
    saveUninitialized: false,  // IMPORTANTE: false economiza DB para visitantes anônimos
    proxy: true,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        secure: isProduction, // Só exige HTTPS em produção
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax'
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// --- VARIÁVEIS GLOBAIS (Locals) ---
app.use((req, res, next) => {
    // Evita lógica de sessão em arquivos estáticos que passaram batido (fallback)
    if (req.path.match(/\.(css|js|png|jpg|ico)$/)) {
        return next();
    }
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// --- ROTAS ---
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

// --- ROTA 404 INTELIGENTE (PREVINE LOOPS) ---
app.use((req, res) => {
    // Se for um asset (imagem, css) que não existe, retorna 404 TEXTO
    // Isso impede que o navegador tente renderizar a página de erro HTML (que pede CSS, que falha...)
    if (req.path.match(/\.(css|js|png|jpg|ico|map|json)$/)) {
        return res.status(404).send('Asset not found');
    }
    
    // Se for página real, renderiza bonito
    res.status(404).render('pages/error', { message: 'Página não encontrada' });
});

// --- EXPORTAÇÃO (VERCEL) ---
module.exports = app;

// --- INICIALIZAÇÃO LOCAL ---
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    pool.query('SELECT NOW()', (err, res) => {
        if (err) console.error('❌ ERRO DB (Local):', err.message);
        else console.log('✅ DB Conectado (Local).');
        
        app.listen(PORT, () => {
            console.log(`✅ Servidor Local rodando na porta ${PORT}`);
            console.log(`��� Traffic Inspector Ativo: Monitorando requisições...`);
        });
    });
}
