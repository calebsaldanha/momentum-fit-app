require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("���️ Ajustando Banco de Dados para Stripe Full...");
        await client.query('BEGIN');
        
        // 1. Adicionar stripe_price_id na tabela plans
        await client.query(`
            ALTER TABLE plans 
            ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);
        `);

        // 2. Limpar tabela de pagamentos para o novo formato
        // (Removemos colunas de upload manual se existirem, focamos no session_id)
        await client.query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS stripe_status VARCHAR(50);
        `);

        /* ⚠️ ATENÇÃO CALEB:
           Aqui definimos IDs de teste genéricos. 
           VOCÊ DEVE RODAR UM UPDATE MANUAL NO BANCO DEPOIS COM SEUS 'price_...' DA STRIPE.
           Ex: UPDATE plans SET stripe_price_id = 'price_123...' WHERE slug = 'pro';
        */
        
        await client.query('COMMIT');
        console.log("✅ Schema atualizado.");
        console.log("⚠️ IMPORTANTE: Atualize a tabela 'plans' com os 'stripe_price_id' reais do seu Dashboard.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Erro:", e);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
