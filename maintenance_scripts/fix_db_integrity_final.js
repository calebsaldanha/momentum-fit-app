require('dotenv').config();
const { pool } = require('../database/db');

async function fixIntegrity() {
    console.log("í»¡ï¸ Iniciando blindagem do banco de dados...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Remover Constraints Antigas (Incorretas)
        console.log("   - Removendo constraints antigas...");
        await client.query('ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_client_id_fkey');
        await client.query('ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_trainer_id_fkey');
        await client.query('ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_user_id_fkey');

        // 2. Adicionar Constraints Corretas
        console.log("   - Aplicando novas constraints corretas...");
        
        // client_id DEVE apontar para a tabela clients (Perfil do Aluno)
        await client.query(`
            ALTER TABLE workouts 
            ADD CONSTRAINT workouts_client_id_fkey 
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        `);

        // user_id DEVE apontar para users (Conta de Login do Aluno)
        await client.query(`
            ALTER TABLE workouts 
            ADD CONSTRAINT workouts_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `);

        // trainer_id DEVE apontar para users (Conta de Login do Criador - Admin ou Trainer)
        // Usamos 'users' aqui para permitir que Admins (que nÃ£o tÃªm perfil em 'trainers') criem treinos.
        await client.query(`
            ALTER TABLE workouts 
            ADD CONSTRAINT workouts_trainer_id_fkey 
            FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE SET NULL
        `);

        await client.query('COMMIT');
        console.log("âœ… Banco de dados corrigido e blindado com sucesso!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("âŒ Erro fatal ao corrigir banco:", err);
    } finally {
        client.release();
        setTimeout(() => process.exit(0), 1000);
    }
}

fixIntegrity();
