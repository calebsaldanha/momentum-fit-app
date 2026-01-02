const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const flash = require('connect-flash');
const db = require('./database/db'); // Importa nosso módulo de banco configurado
require('dotenv').config();

const app = express();

// Configuração da View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Configuração da Sessão (CORREÇÃO AQUI)
// Agora passamos o 'pool' exportado do db.js, que já tem a configuração de SSL correta
app.use(session({
  store: new pgSession({
    pool: db.pool, // Usa o pool configurado em database/db.js
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'chave-secreta-padrao',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Secure true apenas em produção
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
  }
}));

app.use(flash());

// Middleware para disponibilizar mensagens flash e usuário para todas as views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
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

// Tratamento de Erro 404
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
