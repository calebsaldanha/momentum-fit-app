module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        
        // Evita loop se já estiver tentando ir para login
        if (req.path === '/auth/login' || req.path === '/login') {
            return next();
        }

        req.flash('error_msg', 'Por favor, faça login para acessar este recurso');
        res.redirect('/auth/login');
    },

    ensureRole: function(role) {
        return function(req, res, next) {
            if (!req.isAuthenticated()) {
                return res.redirect('/auth/login');
            }

            // Permite superadmin acessar tudo, ou valida role específica
            if (req.user.role === 'superadmin' || req.user.role === role) {
                return next();
            }

            // Se o usuário está logado mas na role errada, NÃO redirecione para login (causa loop).
            // Redirecione para o dashboard DELE ou mostre erro 403.
            req.flash('error_msg', 'Acesso não autorizado para seu perfil.');
            
            // Redirecionamento inteligente baseado na role real do usuário
            const userRole = req.user.role;
            if (userRole === 'client') return res.redirect('/client/dashboard');
            if (userRole === 'trainer') return res.redirect('/trainer/dashboard');
            if (userRole === 'admin') return res.redirect('/admin/dashboard');
            
            res.redirect('/');
        }
    }
};
