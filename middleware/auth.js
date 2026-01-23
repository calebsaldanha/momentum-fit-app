module.exports = {
    // Verifica se o usuário está logado
    ensureAuthenticated: function(req, res, next) {
        if (req.session && req.session.user) {
            return next();
        }
        req.flash('error', 'Por favor, faça login para acessar esta página.');
        req.session.returnTo = req.originalUrl; // Salva url para redirecionar após login (opcional futuro)
        res.redirect('/auth/login');
    },

    // Verifica se o usuário tem o cargo correto
    ensureRole: function(role) {
        return function(req, res, next) {
            // Permite acesso se for o papel correto OU se for superadmin (para testes)
            if (req.session.user && (req.session.user.role === role || req.session.user.role === 'superadmin')) {
                return next();
            }
            
            req.flash('error', 'Acesso não autorizado para seu perfil.');
            
            // Redireciona para o dashboard correto do usuário para não ficar num limbo
            if (req.session.user.role === 'client') {
                return res.redirect('/client/dashboard');
            } else if (req.session.user.role === 'trainer') {
                return res.redirect('/trainer/dashboard');
            } else if (req.session.user.role === 'admin') {
                return res.redirect('/admin/dashboard');
            }
            
            res.redirect('/');
        }
    }
};
