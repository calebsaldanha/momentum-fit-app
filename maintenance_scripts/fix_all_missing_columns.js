require('dotenv').config();
const db = require('../database/db');

async function fix() {
    console.log("Ì¥ß Verificando integridade total do banco...");
    try {
        // 1. Tabela CLIENTS - Todas as colunas da anamnese
        const clientCols = [
            "weight NUMERIC(5,2)", "height INTEGER", "goal VARCHAR(100)", 
            "goal_description TEXT", "activity_level VARCHAR(50)", "available_equipment TEXT",
            "medical_history TEXT", "medications TEXT", "injuries TEXT", "limitations TEXT",
            "sleep_quality VARCHAR(50)", "stress_level VARCHAR(50)", "water_intake VARCHAR(50)",
            "nutrition_type VARCHAR(100)", "alcohol_consumption VARCHAR(50)", "smoking_status VARCHAR(50)",
            "training_experience VARCHAR(50)", "preferred_training_time VARCHAR(50)", "training_days_goal INTEGER",
            "emergency_contact VARCHAR(100)", "emergency_phone VARCHAR(20)"
        ];

        for (let col of clientCols) {
            await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ${col}`);
        }

        // 2. Tabela EXERCISE_LIBRARY
        await db.query(`ALTER TABLE exercise_library ADD COLUMN IF NOT EXISTS muscle_group VARCHAR(100)`);
        await db.query(`ALTER TABLE exercise_library ADD COLUMN IF NOT EXISTS image_url TEXT`);

        // 3. Tabela SUBSCRIPTIONS
        await db.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_due_day INTEGER DEFAULT 10`);

        console.log("‚úÖ Banco de dados blindado contra colunas faltantes.");
        process.exit(0);
    } catch (err) {
        console.error("‚ùå Erro no fix:", err);
        process.exit(1);
    }
}
fix();
