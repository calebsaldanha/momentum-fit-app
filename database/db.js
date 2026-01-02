const { Pool } = require('pg');
require('dotenv').config();

// Verifica se estamos em ambiente de produção
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Habilita SSL apenas em produção (necessário para Vercel/Neon/Supabase)
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Logs de conexão para debug (opcional)
pool.on('connect', () => {
  console.log('Base de dados conectada com sucesso!');
});

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente inativo', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
