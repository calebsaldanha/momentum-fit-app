const { pool } = require('../../database/db');

async function migrate() {
    try {
        console.log("���️ Iniciando correção do banco de dados...");

        // 1. Corrigir tabela client_profiles (Adicionar trainer_id)
        console.log("--> Verificando client_profiles...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS client_profiles (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        await pool.query(`
            ALTER TABLE client_profiles 
            ADD COLUMN IF NOT EXISTS trainer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        `);

        // 2. Criar tabela workout_logs (Para o Dashboard do Cliente)
        console.log("--> Verificando workout_logs...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workout_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
                status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'skipped'
                date DATE DEFAULT CURRENT_DATE,
                duration_minutes INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 3. Criar tabela messages (Para o Chat)
        console.log("--> Verificando messages...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 4. Criar tabela checkins (Caso usada no futuro)
        console.log("--> Verificando checkins...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS checkins (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                weight DECIMAL(5,2),
                mood VARCHAR(50),
                notes TEXT,
                photo_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("✅ Banco de dados corrigido com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro na migração:", err);
        process.exit(1);
    }
}

migrate();
