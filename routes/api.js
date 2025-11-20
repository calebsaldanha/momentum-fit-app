const express = require('express');
const router = express.Router();
const { put } = require('@vercel/blob'); 
const multer = require('multer');
const { pool } = require('../database/db'); 

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    next();
};

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error("BLOB_READ_WRITE_TOKEN não configurada.");
        return res.status(500).json({ error: 'Erro de configuração do servidor (Vercel Blob).' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const file = req.file;
    const fileName = `${req.session.user.id}-${Date.now()}-${file.originalname}`;

    try {
        const blob = await put(fileName, file.buffer, {
            access: 'public',
            contentType: file.mimetype,
        });
        
        res.status(200).json({ url: blob.url });
    } catch (err) {
        console.error("Erro ao fazer upload para o Vercel Blob:", err);
        res.status(500).json({ error: 'Erro ao processar o arquivo de mídia.' });
    }
});

router.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

router.get('/notifications', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC LIMIT 10',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar notificações:', err);
        res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
});

router.post('/notifications/mark-read', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { ids } = req.body; 

        if (ids && ids.length > 0) {
            await pool.query(
                'UPDATE notifications SET is_read = true WHERE user_id = $1 AND id = ANY($2::int[])',
                [userId, ids]
            );
        } else {
            await pool.query(
                'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
                [userId]
            );
        }
        res.json({ success: true, message: 'Notificações marcadas como lidas.' });
    } catch (err) {
        console.error('Erro ao marcar notificações como lidas:', err);
        res.status(500).json({ error: 'Erro ao atualizar notificações' });
    }
});

module.exports = router;
