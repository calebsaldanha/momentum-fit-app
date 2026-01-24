const db = require('../database/db');

async function rebuildSchema() {
    console.log('ÌøóÔ∏è INICIANDO RECONSTRU√á√ÉO ESTRUTURAL DO BANCO DE DADOS...');

    const schemaQueries = [
        // 1. Tabela USERS (Garantir que existe)
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role VARCHAR(50) DEFAULT 'client',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reset_password_token VARCHAR(255),
            reset_password_expires TIMESTAMP
        );`,

        // 2. Tabela PROFILES (A causa do erro atual)
        `CREATE TABLE IF NOT EXISTS profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            height NUMERIC(5,2),
            weight NUMERIC(5,2),
            age INTEGER,
            fitness_level VARCHAR(50),
            goal VARCHAR(255),
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,

        // 3. Tabela TRAINERS
        `CREATE TABLE IF NOT EXISTS trainers (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            specialties TEXT,
            bio TEXT,
            certificate_id VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,

        // 4. Tabela EXERCISES (Biblioteca)
        `CREATE TABLE IF NOT EXISTS exercise_library (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            muscle_group VARCHAR(100),
            equipment VARCHAR(100),
            video_url TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,

        // 5. Tabela WORKOUTS
        `CREATE TABLE IF NOT EXISTS workouts (
            id SERIAL PRIMARY KEY,
            client_id INTEGER REFERENCES users(id),
            trainer_id INTEGER REFERENCES users(id),
            title VARCHAR(255),
            description TEXT,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,

        // 6. Tabela SESSION (Cr√≠tica para login)
        `CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL
        )
        WITH (OIDS=FALSE);`,
        
        // Constraint da sess√£o (pode falhar se j√° existir, por isso em bloco separado se fosse manual, aqui ignoramos erro)
        `ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;`,
        `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`
    ];

    // Executar Queries de Schema
    for (const query of schemaQueries) {
        try {
            await db.query(query);
            console.log('‚úÖ Tabela/Estrutura verificada.');
        } catch (err) {
            // Ignora erro de constraint j√° existente, alerta outros
            if (!err.message.includes('already exists')) {
                console.error('‚ö†Ô∏è Aviso durante cria√ß√£o de tabela:', err.message);
            }
        }
    }

    console.log('Ì¥Ñ Iniciando Cura de Dados (Data Healing)...');

    try {
        // 1. Buscar todos os usu√°rios
        const users = await db.query('SELECT id, role, email FROM users');
        
        for (const user of users.rows) {
            // Verificar se tem perfil
            const profileCheck = await db.query('SELECT id FROM profiles WHERE user_id = $1', [user.id]);
            
            if (profileCheck.rows.length === 0) {
                console.log(`Ìππ Criando perfil padr√£o para usu√°rio √≥rf√£o: ${user.email} (${user.role})`);
                await db.query(`
                    INSERT INTO profiles (user_id, height, weight, fitness_level, goal)
                    VALUES ($1, 1.75, 75.0, 'beginner', 'general_fitness')
                `, [user.id]);
            }

            // Se for trainer, verificar tabela trainers
            if (user.role === 'trainer') {
                const trainerCheck = await db.query('SELECT id FROM trainers WHERE user_id = $1', [user.id]);
                if (trainerCheck.rows.length === 0) {
                    console.log(`Ìæì Criando registro de treinador para: ${user.email}`);
                    await db.query(`
                        INSERT INTO trainers (user_id, specialties, bio)
                        VALUES ($1, 'Geral', 'Treinador Momentum Fit')
                    `, [user.id]);
                }
            }
        }
        console.log('‚ú® Dados sanizados com sucesso.');
        
    } catch (err) {
        console.error('‚ùå Erro na cura de dados:', err);
    }

    console.log('ÌøÅ RECONSTRU√á√ÉO FINALIZADA. SISTEMA PRONTO.');
    process.exit(0);
}

rebuildSchema();
