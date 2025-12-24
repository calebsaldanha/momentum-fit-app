const { pool } = require('./database/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Iniciando migração do schema de client_profiles...');

        // Lista de colunas para adicionar
        const columns = [
            "ADD COLUMN IF NOT EXISTS age INTEGER",
            "ADD COLUMN IF NOT EXISTS phone VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS gender_identity VARCHAR(100)",
            "ADD COLUMN IF NOT EXISTS sex_assigned_at_birth VARCHAR(100)",
            "ADD COLUMN IF NOT EXISTS main_goal TEXT",
            "ADD COLUMN IF NOT EXISTS secondary_goals TEXT",
            "ADD COLUMN IF NOT EXISTS specific_event TEXT",
            "ADD COLUMN IF NOT EXISTS medical_conditions TEXT",
            "ADD COLUMN IF NOT EXISTS medications TEXT",
            "ADD COLUMN IF NOT EXISTS surgeries TEXT",
            "ADD COLUMN IF NOT EXISTS allergies TEXT",
            "ADD COLUMN IF NOT EXISTS past_activity TEXT",
            "ADD COLUMN IF NOT EXISTS injuries TEXT",
            "ADD COLUMN IF NOT EXISTS frequency VARCHAR(100)",
            "ADD COLUMN IF NOT EXISTS diet_description TEXT",
            "ADD COLUMN IF NOT EXISTS sleep_hours VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS challenges TEXT",
            "ADD COLUMN IF NOT EXISTS liked_activities TEXT",
            "ADD COLUMN IF NOT EXISTS disliked_activities TEXT",
            "ADD COLUMN IF NOT EXISTS workout_preference VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS availability TEXT",
            "ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2)",
            "ADD COLUMN IF NOT EXISTS height DECIMAL(5,2)",
            "ADD COLUMN IF NOT EXISTS measure_waist DECIMAL(5,2)",
            "ADD COLUMN IF NOT EXISTS measure_hip DECIMAL(5,2)",
            "ADD COLUMN IF NOT EXISTS measure_arm DECIMAL(5,2)",
            "ADD COLUMN IF NOT EXISTS measure_leg DECIMAL(5,2)",
            "ADD COLUMN IF NOT EXISTS body_fat DECIMAL(5,2)",
            "ADD COLUMN IF NOT EXISTS hormonal_treatment BOOLEAN DEFAULT FALSE",
            "ADD COLUMN IF NOT EXISTS hormonal_details TEXT"
        ];

        for (const col of columns) {
            await client.query(`ALTER TABLE client_profiles ${col}`);
        }

        console.log('Migração concluída com sucesso!');
    } catch (err) {
        console.error('Erro na migração:', err);
    } finally {
        client.release();
        process.exit(); // Encerra o script
    }
}

migrate();
