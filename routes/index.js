const express = require('express');
const router = express.Router();

// Função auxiliar para redirecionamento (mesma lógica do auth, simplificada)
const handleRedirect = (user, res) => {
    if (user.role === 'client') return res.redirect('/client/dashboard');
    if (user.role === 'superadmin') return res.redirect('/superadmin/dashboard');
    if (user.role === 'trainer') return res.redirect(user.status === 'active' ? '/admin/dashboard' : '/trainer/profile');
    return res.redirect('/'); // Fallback
};

router.get('/', (req, res) => {
    // Se o usuário já estiver logado, redireciona para o dashboard apropriado
    if (req.session.user) {
        return handleRedirect(req.session.user, res);
    }

    res.render('pages/index', {
        title: 'Início - Momentum Fit'
    });
});

router.get('/about', (req, res) => {
    res.render('pages/about', {
        title: 'Sobre - Momentum Fit'
    });
});

module.exports = router;
