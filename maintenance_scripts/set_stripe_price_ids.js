require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateIds() {
    const client = await pool.connect();
    try {
        console.log("Ì≥ù Atualizando IDs de Pre√ßo da Stripe...");
        await client.query('BEGIN');

        // 1. Atualizar Momentum VIP
        await client.query(`
            UPDATE plans SET stripe_price_id = 'price_1StTA5RrwP9b7RMziXrKtPRe' 
            WHERE slug = 'vip' OR name ILIKE '%vip%';
        `);
        console.log("‚úÖ VIP ID atualizado.");

        // 2. Atualizar Momentum Pro
        await client.query(`
            UPDATE plans SET stripe_price_id = 'price_1StT20RrwP9b7RMzWOohogE6' 
            WHERE slug = 'pro' OR name ILIKE '%pro%';
        `);
        console.log("‚úÖ Pro ID atualizado.");

        // 3. Atualizar Momentum Start (Free)
        // Mesmo sendo free, guardamos o ID caso mude a estrat√©gia no futuro
        await client.query(`
            UPDATE plans SET stripe_price_id = 'price_1StT8zRrwP9b7RMz32gK7SOf' 
            WHERE slug = 'start' OR name ILIKE '%start%' OR price = 0;
        `);
        console.log("‚úÖ Start ID atualizado.");

        await client.query('COMMIT');
        console.log("Ì∫Ä Tabela de planos sincronizada com a Stripe!");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("‚ùå Erro ao atualizar IDs:", e);
    } finally {
        client.release();
        process.exit(0);
    }
}

updateIds();
