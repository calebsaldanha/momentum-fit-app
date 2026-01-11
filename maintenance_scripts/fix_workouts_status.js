const db = require('../database/db');

async function fixWorkoutsTable() {
    console.log('Verificando tabela workouts...');
    try {
        // Adiciona a coluna status se não existir
        await db.query(`
            ALTER TABLE workouts 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
        `);
        console.log('Coluna "status" verificada/adicionada com sucesso.');
        
        // Garante que treinos existentes tenham status
        await db.query("UPDATE workouts SET status = 'pending' WHERE status IS NULL");
        console.log('Status atualizados para "pending".');

    } catch (error) {
        console.error('Erro ao corrigir workouts:', error);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

fixWorkoutsTable();
