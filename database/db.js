const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  // Força SSL se existir connectionString (Neon exige SSL), independente do ambiente
  ssl: connectionString ? { rejectUnauthorized: false } : false,
  max: 4,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

const initDb = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ DB Conectado com sucesso.');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'client',
        status TEXT DEFAULT 'active',
        reset_password_token TEXT,
        reset_password_expires TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('❌ Erro na conexão com Banco:', err);
  } finally {
    if (client) client.release();
  }
};

module.exports = { pool, initDb };
