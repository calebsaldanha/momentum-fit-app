require('dotenv').config();
const db = require('../database/db');

async function updateSchema() {
    console.log("Ì¥Ñ Iniciando atualiza√ß√£o do esquema 'clients'...");
    try {
        await db.query('BEGIN');

        // Adicionar colunas faltantes na tabela clients
        const columns = [
            'ADD COLUMN IF NOT EXISTS goal_description TEXT',
            'ADD COLUMN IF NOT EXISTS training_experience VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS preferred_training_time VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS medical_history TEXT',
            'ADD COLUMN IF NOT EXISTS medications TEXT',
            'ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255)',
            'ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS sleep_quality VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS stress_level VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS water_intake VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS available_equipment TEXT'
        ];

        for (let col of columns) {
            await db.query(`ALTER TABLE clients ${col}`);
        }

        // Garantir que fitness_goals existe (usado como 'goal')
        await db.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS fitness_goals TEXT');

        await db.query('COMMIT');
        console.log("‚úÖ Esquema atualizado com sucesso!");
    } catch (error) {
        await db.query('ROLLBACK');
        console.error("‚ùå Erro ao atualizar esquema:", error);
    } finally {
        process.exit();
    }
}

updateSchema();
