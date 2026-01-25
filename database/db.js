const { Pool } = require('pg');

// Detecção inteligente de ambiente
// Se estiver na Vercel ou Production, usa SSL. Localmente, tenta sem.
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: 20, // Limite de conexões para evitar overload no Neon
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Listener de erro para evitar crash total
pool.on('error', (err, client) => {
    console.error('❌ Erro inesperado no cliente do banco de dados', err);
    // Não sair do processo, apenas logar
});

module.exports = pool;
