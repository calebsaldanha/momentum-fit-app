module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Por favor, faça login para acessar este recurso');
        res.redirect('/auth/login');
    },
    
    forwardAuthenticated: function(req, res, next) {
        if (!req.isAuthenticated()) {
            return next();
        }
        // Redirecionar baseado no papel se já estiver logado
        if (req.user.role === 'admin' || req.user.role === 'superadmin') {
            return res.redirect('/admin/dashboard');
        }
        if (req.user.role === 'trainer') {
            return res.redirect('/trainer/dashboard');
        }
        return res.redirect('/client/dashboard');
    },

    isClient: function(req, res, next) {
        if (req.user && req.user.role === 'client') {
            return next();
        }
        req.flash('error_msg', 'Acesso não autorizado');
        res.redirect('/');
    },

    isTrainer: function(req, res, next) {
        if (req.user && (req.user.role === 'trainer' || req.user.role === 'admin' || req.user.role === 'superadmin')) {
            return next();
        }
        req.flash('error_msg', 'Acesso restrito a treinadores');
        res.redirect('/');
    },

    isAdmin: function(req, res, next) {
        if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
            return next();
        }
        req.flash('error_msg', 'Acesso restrito a administradores');
        res.redirect('/');
    },

    isSuperAdmin: function(req, res, next) {
        if (req.user && req.user.role === 'superadmin') {
            return next();
        }
        req.flash('error_msg', 'Acesso restrito ao Super Admin');
        res.redirect('/');
    }
};
