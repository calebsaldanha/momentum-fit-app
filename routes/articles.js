const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Listagem de Artigos
router.get('/', async (req, res) => {
    try {
        // Tenta buscar artigos, se a tabela não existir ou estiver vazia, envia array vazio
        // Em produção real, você removeria o bloco try/catch "permissivo"
        const result = await db.query("SELECT * FROM articles WHERE status = 'published' ORDER BY created_at DESC");
        res.render('pages/articles', { articles: result.rows });
    } catch (err) {
        console.error("Erro ao buscar artigos (pode ser tabela inexistente):", err.message);
        // Fallback: renderiza com lista vazia para não quebrar a página
        res.render('pages/articles', { articles: [] });
    }
});

// Detalhes do Artigo
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM articles WHERE id = $1", [req.params.id]);
        if (result.rows.length > 0) {
            res.render('pages/article-details', { article: result.rows[0] });
        } else {
            res.status(404).render('pages/error', { message: 'Artigo não encontrado', error: { status: 404 } });
        }
    } catch (err) {
        res.redirect('/articles');
    }
});

module.exports = router;
