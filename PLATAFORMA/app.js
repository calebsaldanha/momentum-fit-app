// app.js (Configuração Completa para Deploy no Vercel)

// 1. Core Imports
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool: pgPool, initDb } = require('./database/db'); // 🔑 Importa pool e initDb
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const csurf = require('csurf');

// 2. Environment Configuration
dotenv.config();

// 4. Inicializa o App Express
const app = express();

// 5. Configurações e Middlewares Essenciais
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve Arquivos Estáticos (CRUCIAL para fixar o 404 em /css e /images)
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// 6. Middleware de Sessão
app.use(cookieParser());
app.use(session({
    store: new pgSession({
        pool: pgPool, // Usa o pool importado
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'momentum-fit-default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production' 
    }
}));

// 7. CSRF Protection Middleware
const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

// Middleware para expor variáveis para as views EJS
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.isAuthenticated = !!req.session.userId;
    res.locals.user = req.session.user || { role: 'guest' };
    next();
});

// 8. Rotas (Corrigido: Importando todos os módulos de rota)
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/client', require('./routes/client'));
app.use('/trainer', require('./routes/trainer'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));
app.use('/chat', require('./routes/chat'));
app.use('/articles', require('./routes/articles'));
app.use('/workouts', require('./routes/workouts'));
app.use('/superadmin', require('./routes/superadmin'));


// 9. Error Handler (CSRF)
app.use((err, req, res, next) => {
    if (err.code !== 'EBADCSRFTOKEN') {
        console.error(err.stack);
        return res.status(500).render('pages/error', {
            title: 'Erro no Servidor',
            message: 'Algo inesperado aconteceu.'
        });
    }
    res.status(403).render('pages/error', {
        title: 'Acesso Negado',
        message: 'O formulário expirou ou foi enviado de forma incorreta. Tente novamente.'
    });
});

// 10. 404 Fallback (Garante que rotas não mapeadas retornem a página de erro 404)
app.use((req, res) => {
    res.status(404).render('pages/error', { 
        title: '404 Não Encontrado', 
        message: 'Desculpe, não conseguimos encontrar esta página.' 
    });
});


// 11. Exporta o Express app (CRUCIAL para o Vercel)
module.exports = app;

// 12. Listen (Apenas para rodar localmente e garantir initDb é chamado)
const port = process.env.PORT || 3000;
const startServer = async () => {
  try {
    await initDb(); // 🔑 Inicializa o banco de dados
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ Falha ao iniciar o servidor:", error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production') {
    startServer();
}