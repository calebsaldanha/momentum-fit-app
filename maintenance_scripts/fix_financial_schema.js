const db = require('../database/db');

async function fixFinancialSchema() {
    try {
        console.log("Ì≤∞ Verificando schema financeiro...");
        await db.query('BEGIN');

        // 1. Garantir created_at em PAYMENTS
        await db.query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
        `);
        console.log("‚úÖ Coluna created_at verificada em payments.");

        // 2. Garantir created_at em SUBSCRIPTIONS
        await db.query(`
            ALTER TABLE subscriptions 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
        `);
        console.log("‚úÖ Coluna created_at verificada em subscriptions.");

        // 3. Garantir plan_id em SUBSCRIPTIONS
        await db.query(`
            ALTER TABLE subscriptions 
            ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES plans(id);
        `);
        
        await db.query('COMMIT');
        console.log("Ì∫Ä Corre√ß√£o financeira conclu√≠da!");
        process.exit(0);

    } catch (error) {
        await db.query('ROLLBACK');
        console.error("‚ùå Erro ao corrigir schema financeiro:", error);
        process.exit(1);
    }
}

fixFinancialSchema();
