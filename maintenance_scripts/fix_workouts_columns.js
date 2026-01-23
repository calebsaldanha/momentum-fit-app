require('dotenv').config();
const db = require('../database/db');

async function fixSchema() {
    try {
        console.log('Ìª†Ô∏è Verificando e corrigindo colunas na tabela workouts...');
        await db.query(`
            ALTER TABLE workouts 
            ADD COLUMN IF NOT EXISTS muscle_group VARCHAR(100),
            ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);
        `);
        console.log('‚úÖ Banco de dados atualizado!');
        process.exit(0);
    } catch (err) {
        console.error('‚ùå Erro no SQL:', err);
        process.exit(1);
    }
}
fixSchema();
