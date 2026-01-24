// Ì∑± Middleware Tempor√°rio de CMS (Fase 2 Prep)
// Isso garante que as views p√∫blicas tenham dados para renderizar
// antes de implementarmos o banco de dados de conte√∫do.
module.exports = (req, res, next) => {
    res.locals.content = {
        hero_title: "Transforme Seu Potencial em Performance",
        hero_subtitle: "A plataforma definitiva para personal trainers escalarem seus neg√≥cios e alunos atingirem resultados reais.",
        cta_primary: "Come√ßar Agora",
        cta_secondary: "Ver Planos",
        login_title: "Bem-vindo de volta",
        register_title: "Crie sua conta Momentum"
    };
    next();
};
