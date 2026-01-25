const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

// Configuração otimizada para evitar avisos de SSL em Produção vs Local
const poolConfig = {
    connectionString: connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000
};

// Se estiver em produção e usando uma URL com ?sslmode, o pg detecta sozinho.
// Se precisarmos forçar:
if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=')) {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('❌ DB Pool Error:', err.message);
});

module.exports = pool;
