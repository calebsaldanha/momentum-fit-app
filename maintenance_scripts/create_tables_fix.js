const db = require('../database/db');

async function createMissingTables() {
    console.log('Iniciando verificação de tabelas...');

    try {
        // Cria tabela CLIENTS
        await db.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                phone VARCHAR(50),
                birth_date DATE,
                gender VARCHAR(20),
                height NUMERIC(5,2),
                current_weight NUMERIC(5,2),
                fitness_goals TEXT,
                injuries TEXT,
                medications TEXT,
                lifestyle TEXT,
                availability TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabela "clients" verificada/criada.');

        // Cria tabela TRAINERS
        await db.query(`
            CREATE TABLE IF NOT EXISTS trainers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                specialization VARCHAR(100),
                bio TEXT,
                certifications TEXT,
                years_experience INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabela "trainers" verificada/criada.');

    } catch (error) {
        console.error('Erro ao criar tabelas:', error);
    } finally {
        console.log('Concluído.');
        // Encerra o processo após um breve delay para garantir logs
        setTimeout(() => process.exit(0), 1000);
    }
}

createMissingTables();
