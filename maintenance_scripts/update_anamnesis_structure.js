const { Pool } = require('pg');
require('dotenv').config();

// Pega a URL correta
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error("‚ùå ERRO: Defina POSTGRES_URL no seu arquivo .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Neon exige SSL
});

async function migrate() {
    try {
        console.log('Ì¥Ñ Conectando ao Neon para atualizar Anamnese...');
        
        // Garante que a coluna existe como JSONB
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS anamnesis JSONB DEFAULT '{}'::jsonb;
        `);

        console.log('‚úÖ Estrutura de Anamnese atualizada/verificada com sucesso.');
    } catch (error) {
        console.error('‚ùå Erro na migra√ß√£o:', error.message);
    } finally {
        pool.end();
    }
}

migrate();
