require('dotenv').config();
const db = require('../database/db');

async function migrate() {
    console.log("Ì≥Ö Adicionando op√ß√£o de Dia de Pagamento...");
    try {
        await db.query(`
            ALTER TABLE subscriptions 
            ADD COLUMN IF NOT EXISTS payment_due_day INTEGER DEFAULT 10;
        `);
        console.log("‚úÖ Coluna 'payment_due_day' adicionada!");
        process.exit(0);
    } catch (err) {
        console.error("‚ùå Erro:", err);
        process.exit(1);
    }
}

migrate();
