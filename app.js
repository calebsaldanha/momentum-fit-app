require('dotenv').config();

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const path = require('path');
const flash = require('connect-flash');
const pool = require('./database/db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('trust proxy', 1);
app.use(session({
    store: new pgSession({ pool: pool, tableName: 'session' }),
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    }
}));

require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.path = req.path;
    
    // Fix: Capture error flash once to avoid clearing it before assignment
    const errorFlash = req.flash('error');
    res.locals.error_msg = errorFlash;
    res.locals.error = errorFlash;
    
    res.locals.success_msg = req.flash('success');
    res.locals.content = { hero_title: 'Momentum Fit', hero_subtitle: 'Performance' };
    next();
});

app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/trainer', require('./routes/trainer'));
app.use('/client', require('./routes/client'));
app.use('/payment', require('./routes/payment'));

// CORREÃ‡ÃƒO SERVERLESS: SÃ³ roda o listen se for execuÃ§Ã£o direta (local)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`íº€ Server running on ${PORT}`));
}

// Exporta o app para o Vercel conseguir executar
module.exports = app;
