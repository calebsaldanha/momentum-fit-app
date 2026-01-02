const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// Configuração otimizada para Vercel (Serverless) + Neon/Postgres
const pool = new Pool({
  connectionString,
  // SSL é obrigatório para Neon/Supabase e produção
  ssl: connectionString ? { rejectUnauthorized: false } : false,
  
  // CRÍTICO PARA VERCEL:
  // Usa apenas 1 conexão por Lambda. O Serverless escala horizontalmente (várias lambdas),
  // então manter o pool pequeno evita estourar o limite do banco ("max connections reached").
  max: 1, 
  
  // Fecha conexões inativas rapidamente para não ficarem "zumbis" quando a Lambda congelar
  idleTimeoutMillis: 5000, 
  
  // Tempo máximo para tentar conectar antes de desistir (10s é suficiente para acordar o banco)
  connectionTimeoutMillis: 10000, 
});

// Listener de erro no pool para evitar que erros de conexão derrubem o servidor inteiro
pool.on('error', (err) => {
  console.error('⚠️ Erro inesperado no pool do Postgres (recuperável):', err.message);
});

const initDb = async () => {
  let client;
  try {
    // Tenta conectar para validar e criar tabela
    client = await pool.connect();
    
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
    console.log('✅ DB Init: Conexão bem sucedida e tabelas verificadas.');
  } catch (err) {
    // Loga o erro mas NÃO joga throw para não quebrar o boot da Vercel (Erro 500)
    // O app tentará reconectar na próxima requisição
    console.error('❌ Erro no initDb:', err.message);
  } finally {
    if (client) client.release();
  }
};

module.exports = { pool, initDb };
