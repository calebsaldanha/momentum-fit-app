require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
// FIX: Usar middleware local seguro em vez do pacote depreciado
const flash = require('./middleware/flash'); 
const passport = require('passport');
const pool = require('./database/db'); 

console.log('�� Iniciando Momentum Fit App...');

// --- VERIFICAÇÃO DE AMBIENTE ---
if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  AVISO: SESSION_SECRET não definido. Usando segredo inseguro de dev.');
}

// --- CONFIGURAÇÃO DE PROXY (Vercel/Heroku) ---
app.set('trust proxy', 1);

// --- PASSPORT ---
require('./config/passport')(passport);

// --- VIEW ENGINE ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MIDDLEWARES BASE ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- SESSÃO E AUTH ---
// Tratamento de erro na store da sessão para não crashar o app se o DB cair
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15 // 15 min
});

sessionStore.on('error', function(error) {
    console.error('��� Erro crítico na Session Store (Banco de Dados):', error.message);
    // Não crasha o app, mas loga o erro
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'secret_dev_key_123',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// --- FLASH MESSAGES ---
app.use(flash());

// --- VARIÁVEIS GLOBAIS (Locals) ---
app.use((req, res, next) => {
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
    process.exit(1); 
}

// --- ROTA 404 ---
app.use((req, res) => {
    res.status(404).render('pages/error', { message: 'Página não encontrada' });
});

// --- INICIALIZAÇÃO SEGURA DO SERVIDOR ---
const PORT = process.env.PORT || 3000;

// Testa conexão com DB antes de abrir a porta
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ FATAL: Não foi possível conectar ao Banco de Dados.');
        console.error('��� Verifique seu arquivo .env e se o PostgreSQL está rodando.');
        console.error('Detalhe do erro:', err.message);
        // Em dev, continuamos para permitir debug, em prod deveríamos sair.
    } else {
        console.log('✅ Banco de Dados Conectado com Sucesso.');
    }

    app.listen(PORT, () => {
        console.log(`✅ Servidor rodando na porta ${PORT}`);
        console.log(`��� Acesso local: http://localhost:${PORT}`);
    });
});
