require('dotenv').config();
const db = require('../database/db');

async function fixPayments() {
    console.log("Ì≤≥ Iniciando corre√ß√£o da tabela 'payments'...");
    
    try {
        // 1. Adicionar colunas faltantes
        await db.query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS subscription_id INTEGER REFERENCES subscriptions(id),
            ADD COLUMN IF NOT EXISTS proof_url TEXT;
        `);

        // 2. Preencher payment_date para registros antigos (usando created_at)
        await db.query(`
            UPDATE payments 
            SET payment_date = created_at 
            WHERE payment_date IS NULL;
        `);

        console.log("‚úÖ Tabela payments corrigida com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("‚ùå Erro ao corrigir payments:", err);
        process.exit(1);
    }
}

fixPayments();
