require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function healDatabase() {
    const client = await pool.connect();
    try {
        console.log("Ìø• Conectado. Iniciando diagn√≥stico e reparo...");
        await client.query('BEGIN');

        // --- 1. RESOLVER ERRO: relation "assignments" does not exist ---
        console.log("Ì¥ß [1/4] Verificando tabela 'assignments'...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS assignments (
                id SERIAL PRIMARY KEY,
                trainer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(trainer_id, client_id)
            );
        `);
        // Criar √≠ndices para evitar lentid√£o futura
        await client.query('CREATE INDEX IF NOT EXISTS idx_assignments_trainer ON assignments(trainer_id)');

        // --- 2. RESOLVER ERRO: column "is_active" does not exist ---
        console.log("Ì¥ß [2/4] Verificando tabela 'workouts' e coluna 'is_active'...");
        // Garante que a tabela existe
        await client.query(`
            CREATE TABLE IF NOT EXISTS workouts (
                id SERIAL PRIMARY KEY,
                creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                level VARCHAR(20),
                frequency INTEGER DEFAULT 0,
                is_template BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Garante que a coluna is_active existe (Postgres safe add column)
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='is_active') THEN 
                    ALTER TABLE workouts ADD COLUMN is_active BOOLEAN DEFAULT true; 
                END IF;
            END 
            $$;
        `);

        // --- 3. GARANTIA: Tabela PLANS com is_active ---
        console.log("Ì¥ß [3/4] Verificando tabela 'plans'...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                slug VARCHAR(50) UNIQUE NOT NULL,
                price DECIMAL(10,2) DEFAULT 0,
                stripe_price_id VARCHAR(100),
                features JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='is_active') THEN 
                    ALTER TABLE plans ADD COLUMN is_active BOOLEAN DEFAULT true; 
                END IF;
            END 
            $$;
        `);

        // --- 4. GARANTIA: Tabela EXERCISES ---
        console.log("Ì¥ß [4/4] Verificando tabela 'exercises'...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS exercises (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                muscle_group VARCHAR(50),
                equipment VARCHAR(50),
                video_url TEXT,
                instructions TEXT,
                is_custom BOOLEAN DEFAULT false,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('COMMIT');
        console.log("‚úÖ BANCO DE DADOS REPARADO COM SUCESSO.");
        console.log("Ì±â Tabela 'assignments' criada.");
        console.log("Ì±â Coluna 'is_active' adicionada em 'workouts'.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("‚ùå ERRO CR√çTICO NO REPARO:", e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

healDatabase();
