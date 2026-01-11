const db = require('../database/db');

async function updateClientsSchema() {
    console.log("Iniciando atualização da tabela clients...");

    const columnsToAdd = [
        "ADD COLUMN IF NOT EXISTS age INTEGER",
        "ADD COLUMN IF NOT EXISTS gender_identity VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS sex_assigned_at_birth VARCHAR(10)",
        "ADD COLUMN IF NOT EXISTS hormonal_treatment BOOLEAN DEFAULT FALSE",
        "ADD COLUMN IF NOT EXISTS hormonal_details TEXT",
        "ADD COLUMN IF NOT EXISTS body_fat VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS measure_waist VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS measure_hip VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS measure_arm VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS measure_leg VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS secondary_goals TEXT",
        "ADD COLUMN IF NOT EXISTS specific_event TEXT",
        "ADD COLUMN IF NOT EXISTS medical_conditions TEXT",
        "ADD COLUMN IF NOT EXISTS surgeries TEXT",
        "ADD COLUMN IF NOT EXISTS allergies TEXT",
        "ADD COLUMN IF NOT EXISTS fitness_level VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS training_days_frequency INTEGER",
        "ADD COLUMN IF NOT EXISTS workout_preference VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS equipment TEXT",
        "ADD COLUMN IF NOT EXISTS time_availability VARCHAR(100)",
        "ADD COLUMN IF NOT EXISTS sleep_hours VARCHAR(100)",
        "ADD COLUMN IF NOT EXISTS diet_description TEXT",
        "ADD COLUMN IF NOT EXISTS challenges TEXT",
        "ADD COLUMN IF NOT EXISTS liked_activities TEXT",
        "ADD COLUMN IF NOT EXISTS disliked_activities TEXT",
        "ADD COLUMN IF NOT EXISTS past_activity TEXT"
    ];

    try {
        for (const column of columnsToAdd) {
            await db.query(`ALTER TABLE clients ${column};`);
            console.log(`Comando executado: ${column}`);
        }
        console.log("Tabela clients atualizada com sucesso!");
    } catch (error) {
        console.error("Erro ao atualizar tabela clients:", error);
    } finally {
        process.exit();
    }
}

updateClientsSchema();
