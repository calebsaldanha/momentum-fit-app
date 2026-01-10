const db = require('../database/db');

console.log("Iniciando verificação completa e blindagem do Banco de Dados...");

const addColumn = (table, column, type) => {
    return new Promise((resolve) => {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log(`Erro ao adicionar ${column} em ${table}:`, err.message);
            } else if (!err) {
                console.log(`[SUCESSO] Coluna '${column}' adicionada em '${table}'.`);
            }
            resolve();
        });
    });
};

const runAudit = async () => {
    // 1. Tabela CLIENTS - Dados de Anamnese e Perfil
    await addColumn('clients', 'height', 'REAL');
    await addColumn('clients', 'current_weight', 'REAL');
    await addColumn('clients', 'fitness_goals', 'TEXT');
    await addColumn('clients', 'injuries', 'TEXT');
    await addColumn('clients', 'medications', 'TEXT');
    await addColumn('clients', 'lifestyle', 'TEXT');
    await addColumn('clients', 'availability', 'TEXT');
    await addColumn('clients', 'birth_date', 'TEXT');
    await addColumn('clients', 'gender', 'TEXT');

    // 2. Tabela USERS - Dados de Acesso e Perfil Geral
    await addColumn('users', 'profile_image', 'TEXT');
    await addColumn('users', 'last_login', 'DATETIME');
    await addColumn('users', 'reset_token', 'TEXT');
    await addColumn('users', 'reset_token_expires', 'DATETIME');

    // 3. Tabela WORKOUTS - Detalhes do Treino
    await addColumn('workouts', 'feedback', 'TEXT');
    await addColumn('workouts', 'difficulty_rating', 'INTEGER');
    await addColumn('workouts', 'completed_at', 'DATETIME');

    // 4. Tabela CHECKINS - Progresso
    db.run(`CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        weight REAL,
        body_fat REAL,
        notes TEXT,
        photo_front TEXT,
        photo_back TEXT,
        photo_side TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id)
    )`);
    
    console.log("Banco de dados atualizado e pronto para receber todos os dados.");
};

runAudit();
