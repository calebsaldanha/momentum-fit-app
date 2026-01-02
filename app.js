const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const flash = require('connect-flash');
const csrf = require('csurf'); // Importa o csurf
const db = require('./database/db'); 
require('dotenv').config();

const app = express();

// CORREÇÃO: Necessário para cookies seguros funcionarem atrás de proxies (Vercel, Railway, etc)
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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

// Configuração do CSRF (Deve vir APÓS session e cookieParser)
const csrfProtection = csrf({ cookie: false }); // usa sessão por padrão se cookie for false
app.use(csrfProtection);

// Middleware Global
app.use((req, res, next) => {
  // Variáveis Flash
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  
  // Variáveis de Usuário
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user; 
  
  // CORREÇÃO: Disponibiliza o csrfToken para TODAS as views
  res.locals.csrfToken = req.csrfToken();
  
  next();
});

// Tratamento de Erro CSRF
app.use((err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  
  // Se der erro de token inválido/ausente
  console.error('Erro CSRF:', err);
  res.status(403);
  res.render('pages/error', { 
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
