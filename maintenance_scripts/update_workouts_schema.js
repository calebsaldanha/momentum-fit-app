require('dotenv').config();
const db = require('../database/db');

async function updateSchema() {
    try {
        console.log('Ì¥Ñ Atualizando schema da tabela workouts...');
        
        await db.query(`
            ALTER TABLE workouts 
            ADD COLUMN IF NOT EXISTS muscle_group VARCHAR(100),
            ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);
        `);
        
        console.log('‚úÖ Tabela workouts atualizada com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('‚ùå Erro ao atualizar schema:', err);
        process.exit(1);
    }
}

updateSchema();
