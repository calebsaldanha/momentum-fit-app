const { pool } = require('../../database/db');

async function migrate() {
    try {
        console.log('Ì¥ß Adicionando coluna last_login na tabela users...');
        
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
        `);
        
        console.log('‚úÖ Coluna last_login adicionada com sucesso.');
    } catch (err) {
        console.error('‚ùå Erro ao migrar:', err);
    } finally {
        process.exit();
    }
}

migrate();
