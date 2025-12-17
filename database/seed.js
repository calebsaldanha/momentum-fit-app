require('dotenv').config();
const { pool, initDb } = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        await initDb();
        console.log('Iniciando alimentação do banco...');
        const hash = await bcrypt.hash('123456', 10);

        // Treinador
        await pool.query(
            "INSERT INTO users (name, email, password, role, status) VALUES ('Treinador Momentum', 'treinador@test.com', $1, 'trainer', 'active') ON CONFLICT (email) DO NOTHING",
            [hash]
        );

        // Cliente
        await pool.query(
            "INSERT INTO users (name, email, password, role, status) VALUES ('Aluno Teste', 'aluno@test.com', $1, 'client', 'active') ON CONFLICT (email) DO NOTHING",
            [hash]
        );

        console.log('Alimentação concluída! Use o login: aluno@test.com / 123456');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
seed();
