const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const flash = require('connect-flash');
const csrf = require('csurf'); 
const db = require('./database/db'); 
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser());

// Configuração de Sessão
app.use(session({
  store: new pgSession({
    pool: db.pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15
  }),
  secret: process.env.SESSION_SECRET || 'chave-secreta-padrao',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(flash());

const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);

// Middleware Global
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user; 
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Tratamento de Erro CSRF
app.use((err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  console.error('Erro CSRF:', err);
  res.status(403).render('pages/error', { 
    message: 'Sessão expirada ou token inválido. Por favor, recarregue a página e tente novamente.',
    error: { status: 403 }
  });
});

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/trainer', require('./routes/trainer'));
app.use('/client', require('./routes/client'));
app.use('/workouts', require('./routes/workouts'));
app.use('/articles', require('./routes/articles'));
app.use('/superadmin', require('./routes/superadmin'));
app.use('/chat', require('./routes/chat'));
app.use('/notifications', require('./routes/notifications'));

app.use((req, res) => {
  res.status(404).render('pages/error', {
    message: 'Página não encontrada',
    error: { status: 404 }
  });
});

// Inicialização do Servidor (Condicional para evitar erro no Vercel)
// Se o arquivo for rodado diretamente (node app.js), inicia o servidor.
// Se for importado (pelo Vercel), apenas exporta o app.
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
}

module.exports = app;
