require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
console.log("Ì¥ç Testando conex√£o com:", connectionString ? connectionString.split('@')[1] : 'NADA DEFINIDO');

if (!connectionString) {
    console.error("‚ùå ERRO: Nenhuma URL de banco encontrada no .env");
    process.exit(1);
}

// Configura√ß√£o id√™ntica √† de produ√ß√£o
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Teste permissivo primeiro
    connectionTimeoutMillis: 5000 // 5s timeout
});

(async () => {
    try {
        console.log("‚è≥ Tentando conectar...");
        const client = await pool.connect();
        console.log("‚úÖ Conex√£o TCP estabelecida!");
        const res = await client.query('SELECT NOW()');
        console.log("‚úÖ Query SQL executada:", res.rows[0]);
        client.release();
        await pool.end();
        console.log("Ìæâ BANCO EST√Å OPERACIONAL.");
        process.exit(0);
    } catch (err) {
        console.error("Ì¥• FALHA DE CONEX√ÉO:", err.message);
        if (err.message.includes('SSL')) console.error("Ì≤° Dica: Verifique a config de SSL no db.js");
        if (err.message.includes('timeout')) console.error("Ì≤° Dica: Firewall ou Internet bloqueando porta 5432.");
        process.exit(1);
    }
})();
