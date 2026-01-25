const db = require('../database/db');

// Carrega o conteúdo do site e disponibiliza em res.locals.cms
const contentLoader = async (req, res, next) => {
    try {
        const result = await db.query('SELECT page, section, key, value FROM site_content');
        
        const cms = {};

        result.rows.forEach(row => {
            if (!cms[row.page]) cms[row.page] = {};
            if (!cms[row.page][row.section]) cms[row.page][row.section] = {};
            
            // Estrutura: cms.home.hero.title
            cms[row.page][row.section][row.key] = row.value;
        });

        // Helper seguro para evitar erro se a chave não existir
        res.locals.getText = (page, section, key, fallback) => {
            try {
                return cms[page][section][key] || fallback;
            } catch (e) {
                return fallback;
            }
        };

        next();
    } catch (err) {
        console.error("Erro ao carregar CMS:", err);
        // Fallback vazio para não quebrar o site
        res.locals.getText = (p, s, k, f) => f;
        next();
    }
};

module.exports = contentLoader;
