require('dotenv').config();
const { pool, initDb } = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        await initDb();
        const hash = await bcrypt.hash('123456', 10);

        // Criar Treinador
        const tRes = await pool.query(
            "INSERT INTO users (name, email, password, role, status) VALUES ('Treinador Pro', 'treinador@test.com', $1, 'trainer', 'active') ON CONFLICT (email) DO UPDATE SET role='trainer' RETURNING id",
            [hash]
        );
        const trainerId = tRes.rows[0].id;

        // Criar Cliente
        const cRes = await pool.query(
            "INSERT INTO users (name, email, password, role, status) VALUES ('Aluno Focado', 'aluno@test.com', $1, 'client', 'active') ON CONFLICT (email) DO UPDATE SET role='client' RETURNING id",
            [hash]
        );
        const clientId = cRes.rows[0].id;

        // Garantir Perfil do Cliente
        await pool.query(
            "INSERT INTO client_profiles (user_id, age, fitness_level, assigned_trainer_id) VALUES ($1, 25, 'Intermediário', $2) ON CONFLICT (user_id) DO NOTHING",
            [clientId, trainerId]
        );

        // Criar Treino de Teste (JSONB)
        const exercises = [
            { name: 'Supino Reto', sets: '4', reps: '10', rest: '60', notes: 'Manter a cadência' },
            { name: 'Agachamento', sets: '3', reps: '12', rest: '90', notes: 'Amplitude máxima' }
        ];

        await pool.query(
            "INSERT INTO workouts (client_id, trainer_id, title, description, exercises) VALUES ($1, $2, 'Treino A - Força', 'Foco em compostos', $3) ON CONFLICT DO NOTHING",
            [clientId, trainerId, JSON.stringify(exercises)]
        );

        console.log('Banco populado com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
seed();
