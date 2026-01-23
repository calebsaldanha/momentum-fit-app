require('dotenv').config();
const db = require('../database/db');

async function prepareDatabase() {
    try {
        console.log('Ìª†Ô∏è Verificando schema do banco de dados...');
        
        // Colunas para Treinos (evita erro no Dashboard)
        await db.query(`
            ALTER TABLE workouts 
            ADD COLUMN IF NOT EXISTS muscle_group VARCHAR(100),
            ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);
        `);

        // Colunas para Anamnese IA (evita erro no Perfil)
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS sleep_hours VARCHAR(50),
            ADD COLUMN IF NOT EXISTS stress_level VARCHAR(50),
            ADD COLUMN IF NOT EXISTS diet_type VARCHAR(100),
            ADD COLUMN IF NOT EXISTS hydration_level VARCHAR(50),
            ADD COLUMN IF NOT EXISTS alcohol_consumption VARCHAR(100),
            ADD COLUMN IF NOT EXISTS motivation_source TEXT;
        `);

        console.log('‚úÖ Banco de dados preparado.');
        process.exit(0);
    } catch (err) {
        console.error('‚ùå Erro na prepara√ß√£o do banco:', err);
        process.exit(1);
    }
}

prepareDatabase();
