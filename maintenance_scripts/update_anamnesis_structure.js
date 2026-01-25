const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('��� Atualizando estrutura de Anamnese...');
        
        // Garante que a coluna existe e é do tipo JSONB
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS anamnesis JSONB DEFAULT '{}'::jsonb;
        `);

        // Opcional: Adicionar colunas físicas para dados críticos de busca se necessário
        // Mas para anamnese detalhada, JSONB é ideal.

        console.log('✅ Banco de dados pronto para nova ficha.');
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    } finally {
        pool.end();
    }
}

migrate();
