module.exports = {
    // Verifica se o usuário está logado
    ensureAuthenticated: function(req, res, next) {
        if (req.session && req.session.user) {
            return next();
        }
        // Se for uma requisição API (como o Chat), retorna JSON em vez de redirect
        if (req.originalUrl.startsWith('/api/') || req.xhr) {
            return res.status(401).json({ error: 'Não autorizado' });
        }
        
        req.flash('error', 'Por favor, faça login para acessar esta página.');
        res.redirect('/auth/login');
    },

    // Verifica se o usuário tem o cargo correto
    ensureRole: function(role) {
        return function(req, res, next) {
            // Superadmin acessa tudo
            if (req.session.user && (req.session.user.role === role || req.session.user.role === 'superadmin')) {
                return next();
            }
            
            req.flash('error', 'Acesso não autorizado para seu perfil.');
            
            // Redireciona para o dashboard correto do usuário
            if (req.session.user.role === 'client') return res.redirect('/client/dashboard');
            if (req.session.user.role === 'trainer') return res.redirect('/trainer/dashboard');
            if (req.session.user.role === 'admin') return res.redirect('/admin/dashboard');
            
            res.redirect('/');
        }
    }
};
