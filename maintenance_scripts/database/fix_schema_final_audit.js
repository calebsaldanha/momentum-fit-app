const { pool } = require('../../database/db');

async function auditAndFix() {
    try {
        console.log("Ì¥ç Iniciando auditoria completa do esquema client_profiles...");
        
        const requiredColumns = [
            { name: 'age', type: 'INTEGER' },
            { name: 'phone', type: 'VARCHAR(50)' },
            { name: 'gender_identity', type: 'VARCHAR(100)' },
            { name: 'sex_assigned_at_birth', type: 'VARCHAR(100)' },
            { name: 'hormonal_treatment', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'hormonal_details', type: 'TEXT' },
            { name: 'weight', type: 'DECIMAL(5,2)' },
            { name: 'height', type: 'DECIMAL(5,2)' },
            { name: 'body_fat', type: 'DECIMAL(5,2)' },
            { name: 'measure_waist', type: 'DECIMAL(5,2)' },
            { name: 'measure_hip', type: 'DECIMAL(5,2)' },
            { name: 'measure_arm', type: 'DECIMAL(5,2)' },
            { name: 'measure_leg', type: 'DECIMAL(5,2)' },
            { name: 'main_goal', type: 'TEXT' },
            { name: 'secondary_goals', type: 'TEXT' },
            { name: 'specific_event', type: 'TEXT' },
            { name: 'medical_conditions', type: 'TEXT' },
            { name: 'medications', type: 'TEXT' },
            { name: 'injuries', type: 'TEXT' },
            { name: 'surgeries', type: 'TEXT' },
            { name: 'allergies', type: 'TEXT' },
            { name: 'fitness_level', type: 'VARCHAR(50)' },
            { name: 'training_days', type: 'VARCHAR(50)' },
            { name: 'workout_preference', type: 'VARCHAR(50)' },
            { name: 'availability', type: 'TEXT' },
            { name: 'equipment', type: 'TEXT' },
            { name: 'sleep_hours', type: 'VARCHAR(50)' },
            { name: 'diet_description', type: 'TEXT' },
            { name: 'challenges', type: 'TEXT' }
        ];

        for (const col of requiredColumns) {
            await pool.query(`ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
            console.log(`   -> Coluna '${col.name}' verificada/criada.`);
        }

        console.log("‚úÖ Auditoria conclu√≠da! Todas as colunas do formul√°rio existem no banco.");
        process.exit(0);
    } catch (err) {
        console.error("‚ùå Erro na auditoria:", err);
        process.exit(1);
    }
}

auditAndFix();
