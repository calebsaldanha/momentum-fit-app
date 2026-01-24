// ✅ MIDDLEWARE DE AUTENTICAÇÃO CENTRALIZADO
module.exports = {
    // Garante que o usuário está logado
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        // Evita loop de redirecionamento se já estiver no login
        if (req.path === '/auth/login' || req.path === '/login') {
            return next();
        }
        req.flash('error_msg', 'Faça login para continuar');
        res.redirect('/auth/login');
    },

    // Garante que o usuário tem o cargo correto
    ensureRole: function(requiredRole) {
        return function(req, res, next) {
            // Primeiro checa se está logado
            if (!req.isAuthenticated()) {
                req.flash('error_msg', 'Sessão expirada');
                return res.redirect('/auth/login');
            }

            // Superadmin acessa tudo
            if (req.user.role === 'superadmin') {
                return next();
            }

            // Checa o cargo específico
            if (req.user.role === requiredRole) {
                return next();
            }

            // Acesso negado: Redireciona para o dashboard correto do usuário
            console.warn(`⛔ Acesso negado: Usuário ${req.user.email} (${req.user.role}) tentou acessar área de ${requiredRole}`);
            req.flash('error_msg', 'Acesso não autorizado.');
            
            if (req.user.role === 'admin') return res.redirect('/admin/dashboard');
            if (req.user.role === 'trainer') return res.redirect('/trainer/dashboard');
            if (req.user.role === 'client') return res.redirect('/client/dashboard');
            
            return res.redirect('/');
        }
    }
};
