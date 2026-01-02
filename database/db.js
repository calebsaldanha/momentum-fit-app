const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("⚠️ AVISO: POSTGRES_URL não definida!");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : false,
  
  // AUMENTADO PARA 4: Evita que a sessão e o initDb travem um ao outro no boot
  max: 4, 
  
  // Configurações de sobrevivência da conexão (Keep-Alive)
  connectionTimeoutMillis: 30000, // 30s de tolerância para conectar
  idleTimeoutMillis: 30000,       // 30s para fechar inativas
  keepAlive: true,
});

// Tratamento de erros silenciosos do pool
pool.on('error', (err) => {
  console.error('⚠️ Erro no Pool do Postgres (recuperável):', err.message);
});

const initDb = async () => {
  let client;
  try {
    // Tenta conectar sem travar o app se falhar (o app deve tentar de novo na request)
    client = await pool.connect();
    
    // Criação de tabelas essenciais
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
    console.log('✅ DB Init: Tabelas verificadas.');
  } catch (err) {
    console.error('❌ DB Init Falhou (App continuará rodando):', err.message);
  } finally {
    if (client) {
      try { client.release(); } catch(e) {}
    }
  }
};

module.exports = { pool, initDb };
