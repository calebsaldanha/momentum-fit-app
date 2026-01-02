const { Pool } = require('pg');
require('dotenv').config();

// Tenta pegar a URL de conexão de ambas as variáveis comuns na Vercel
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// LOG DE DEBUG (Não mostra a senha, apenas se a variável existe)
if (!connectionString) {
  console.error("❌ ERRO CRÍTICO: Nenhuma string de conexão encontrada (DATABASE_URL ou POSTGRES_URL vazias).");
  console.error("O sistema tentará conectar em localhost (127.0.0.1), o que falhará na Vercel.");
} else {
  console.log("✅ Variável de conexão com banco de dados detectada.");
}

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✅ Pool de conexão: Cliente conectado com sucesso!');
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no cliente inativo do pool:', err);
  // Não damos exit(-1) aqui para evitar crash loop imediato se for erro transiente
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
