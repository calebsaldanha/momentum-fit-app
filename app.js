// app.js (Configuração Completa para Deploy no Vercel)

// 1. Core Imports
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const csurf = require('csurf');

// 2. Environment Configuration
dotenv.config();

// 3. Database Pool (para armazenamento de sessão)
const pgPool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

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
        pool: pgPool,
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

// 8. Rotas (Ajuste ou Descomente conforme seus arquivos de rota em 'routes/')

// ESTE BLOCO DEVE SER REMOVIDO/SUBSTITUÍDO PELOS 'require' DAS SUAS ROTAS:
app.get('/', (req, res) => {
    // Rota temporária para carregar a página inicial (views/pages/index.ejs)
    res.render('pages/index', {
        title: 'Início',
        isAuthenticated: res.locals.isAuthenticated,
        user: res.locals.user
    });
});
// EXEMPLO DE IMPORTAÇÃO CORRETA:
// app.use('/', require('./routes/index'));
// app.use('/auth', require('./routes/auth'));
// ... outras rotas ...


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

// 12. Listen (Apenas para rodar localmente)
const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}
