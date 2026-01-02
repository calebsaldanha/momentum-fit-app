const { Pool } = require('pg');
require('dotenv').config();

// Verificação de segurança: Se não houver URL do banco, pare imediatamente.
if (!process.env.DATABASE_URL) {
  console.error("❌ ERRO FATAL: A variável de ambiente DATABASE_URL não está definida.");
  console.error("Na Vercel, vá em Settings > Environment Variables e adicione sua string de conexão.");
  // Não encerramos o processo aqui para permitir que o build passe, mas a conexão falhará com msg clara
}

const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
};

const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  console.log('✅ Base de dados conectada com sucesso!');
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no cliente do banco:', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exportação obrigatória para o connect-pg-simple
};
