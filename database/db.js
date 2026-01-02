const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("⚠️ AVISO CRÍTICO: POSTGRES_URL não encontrada nas variáveis de ambiente!");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : false,
  
  // CORREÇÃO DE DEADLOCK:
  // Aumentado para 2. Com 1, o 'connect-pg-simple' e o 'initDb'
  // competem pela mesma conexão no boot, causando timeout.
  max: 2,
  
  // Configurações de sobrevivência da conexão
  connectionTimeoutMillis: 20000, // 20s de tolerância
  idleTimeoutMillis: 30000,       // 30s de inatividade
  keepAlive: true,
  application_name: 'momentum-fit-app'
});

// Listener de erros para evitar crash do Node
pool.on('error', (err, client) => {
  console.error('⚠️ Erro silencioso no pool (recuperável):', err.message);
});

// Função auxiliar de delay
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initDb = async (retries = 3) => {
  let client;
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`��� Tentativa de conexão ao DB ${i + 1}/${retries}...`);
      client = await pool.connect();
      
      console.log('✅ Conectado. Verificando schema...');
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
      console.log('✅ DB Init: Sucesso.');
      return; // Sucesso, sai da função
      
    } catch (err) {
      console.error(`⚠️ Falha na tentativa ${i + 1}:`, err.message);
      if (client) {
        try { client.release(); } catch(e) {}
        client = null;
      }
      
      // Se for a última tentativa, lança o erro (ou apenas loga final)
      if (i === retries - 1) {
        console.error('❌ Não foi possível conectar ao banco após várias tentativas.');
      } else {
        // Espera 2 segundos antes de tentar de novo (ajuda se o banco estiver acordando)
        await wait(2000);
      }
    } finally {
      if (client) {
        try { client.release(); } catch(e) {}
      }
    }
  }
};

module.exports = { pool, initDb };
