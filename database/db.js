const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// Configuração de Pool Otimizada para Vercel
const pool = new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : false,
  max: 2, // Limite baixo para evitar sobrecarga no Serverless
  connectionTimeoutMillis: 10000, // 10s para tentar conectar
  idleTimeoutMillis: 30000, // 30s para fechar conexão inativa
  keepAlive: true,
});

pool.on('error', (err) => {
  console.error('⚠️ Erro no Pool (recuperável):', err.message);
});

const initDb = async () => {
  let client;
  try {
    // Tenta obter cliente do pool
    client = await pool.connect();
    
    // 1. Criar Tabela de Usuários
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

    // 2. Criar Tabela de Sessão (Manual) para tirar carga do connect-pg-simple
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);

      ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;

      CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
    `).catch(e => {
        // Ignora erro se a constraint já existir (tabela já criada)
        if (!e.message.includes('already exists')) console.error('Erro tabela session:', e.message);
    });

    console.log('✅ DB Init: Tabelas users e session verificadas.');
  } catch (err) {
    console.error('❌ Erro no initDb:', err.message);
  } finally {
    if (client) {
      try { client.release(); } catch(e) {}
    }
  }
};

module.exports = { pool, initDb };
