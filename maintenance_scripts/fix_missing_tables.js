require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function repairDatabase() {
    const client = await pool.connect();
    try {
        console.log("Ì≥ä === TABELAS EXISTENTES ===");
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        const tables = res.rows.map(r => r.table_name);
        console.log(tables.join(', '));
        console.log("----------------------------");

        await client.query('BEGIN');

        // 1. Tabela Assignments (V√≠nculo Trainer-Aluno) - CAUSA DO ERRO
        if (!tables.includes('assignments')) {
            console.log("Ìª†Ô∏è Criando tabela 'assignments'...");
            await client.query(`
                CREATE TABLE assignments (
                    id SERIAL PRIMARY KEY,
                    trainer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(trainer_id, client_id)
                );
                CREATE INDEX idx_assignments_trainer ON assignments(trainer_id);
                CREATE INDEX idx_assignments_client ON assignments(client_id);
            `);
        } else {
            console.log("‚úÖ Tabela 'assignments' j√° existe.");
        }

        // 2. Tabela Workouts (Treinos) - Dashboard do Trainer consulta isso
        if (!tables.includes('workouts')) {
            console.log("Ìª†Ô∏è Criando tabela 'workouts'...");
            await client.query(`
                CREATE TABLE workouts (
                    id SERIAL PRIMARY KEY,
                    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Trainer
                    client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,   -- Aluno (opcional se for template)
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    level VARCHAR(20), -- iniciante, intermediario, avancado
                    frequency INTEGER DEFAULT 0, -- vezes na semana
                    is_template BOOLEAN DEFAULT false,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
        }

        // 3. Tabela Exercises (Biblioteca)
        if (!tables.includes('exercises')) {
            console.log("Ìª†Ô∏è Criando tabela 'exercises'...");
            await client.query(`
                CREATE TABLE exercises (
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
        }

        // 4. Garantir colunas na tabela USERS
        console.log("Ì¥ß Verificando colunas de 'users'...");
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS photo_url TEXT,
            ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
            ADD COLUMN IF NOT EXISTS objective VARCHAR(100),
            ADD COLUMN IF NOT EXISTS current_plan_id INTEGER,
            ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;
        `);

        // 5. Garantir Planos B√°sicos
        console.log("Ì≤≥ Verificando planos...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50),
                slug VARCHAR(50) UNIQUE,
                price DECIMAL(10,2),
                stripe_price_id VARCHAR(100),
                features JSONB
            );
        `);
        
        // Inserir planos se tabela estiver vazia
        const plansCount = await client.query('SELECT COUNT(*) FROM plans');
        if (parseInt(plansCount.rows[0].count) === 0) {
            console.log("Ìº± Semeando planos padr√£o...");
            await client.query(`
                INSERT INTO plans (name, slug, price, features) VALUES
                ('Start', 'start', 0.00, '["App Acesso"]'),
                ('Momentum Pro', 'pro', 89.90, '["IA Coach", "Treinos Ilimitados"]'),
                ('VIP Personal', 'vip', 249.90, '["Personal Humano"]');
            `);
        }

        await client.query('COMMIT');
        console.log("‚úÖ Reparo conclu√≠do com sucesso!");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("‚ùå Erro fatal durante reparo:", e);
    } finally {
        client.release();
    }
}

repairDatabase();
