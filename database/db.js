const { Pool } = require('pg');
require('dotenv').config();

// Configuração SSL condicional: Obrigatória para produção, opcional localmente
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Base de Dados conectada com sucesso!');
});

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente do banco de dados', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
