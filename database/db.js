// Carregar variáveis de ambiente se não estiver em produção
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("❌ FATAL: DATABASE_URL indefinida.");
    if (process.env.NODE_ENV === 'production') process.exit(1);
}

// Detecção robusta de SSL
// Se a URL contém 'localhost' ou '127.0.0.1', desativa SSL.
// Caso contrário (Neon, AWS, Vercel), FORÇA SSL.
const isLocalhost = dbUrl && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1'));
const sslConfig = isLocalhost ? false : { rejectUnauthorized: false };

console.log(`��� DB Connection: ${isLocalhost ? 'Local (No SSL)' : 'Remote (SSL Active)'}`);

const pool = new Pool({
    connectionString: dbUrl,
    ssl: sslConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Aumentado para conexões lentas
});

pool.on('error', (err) => {
    console.error('❌ Erro inesperado no pool do banco:', err);
});

module.exports = pool;
