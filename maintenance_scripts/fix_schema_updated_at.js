const { pool } = require('./database/db');

async function migrate() {
    try {
        console.log('Iniciando correção: Adicionando coluna updated_at em client_profiles...');
        
        await pool.query(`
            ALTER TABLE client_profiles 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
        `);

        console.log('Correção aplicada com sucesso!');
    } catch (err) {
        console.error('Erro ao aplicar correção:', err);
    } finally {
        process.exit();
    }
}

migrate();
