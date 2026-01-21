const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Configuração SSL robusta para Vercel/Neon/Postgres
const sslConfig = isProduction 
    ? { rejectUnauthorized: false } 
    : false;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
    // Console log silencioso em produção para não poluir logs
    if (!isProduction) console.log('Base de dados conectada com sucesso!');
});

pool.on('error', (err) => {
    console.error('Erro inesperado no cliente da pool', err);
    // Não encerra o processo, apenas loga
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
