const { Pool } = require('pg');
require('dotenv').config();

// 1. Tenta pegar POSTGRES_URL (Neon/Vercel), fallback para DATABASE_URL
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// 2. Validação de Segurança
if (!connectionString) {
    console.error("❌ ERRO FATAL: Nenhuma string de conexão encontrada.");
    console.error("��� Verifique se 'POSTGRES_URL' está definida no .env ou na Vercel.");
    // Em produção, isso deve parar o app para não ficar em estado zumbi
    if (process.env.NODE_ENV === 'production') {
        throw new Error("DB Connection String Missing");
    }
}

// 3. Configuração do Pool otimizada para Neon
const poolConfig = {
    connectionString: connectionString,
    max: 10,                 // Máximo de conexões (Neon Serverless gosta de poucas)
    connectionTimeoutMillis: 5000, // Timeout rápido para falhar logo se não conectar
    idleTimeoutMillis: 30000,
    ssl: { 
        rejectUnauthorized: false // Necessário para Neon se o CA root não estiver no container
    }
};

const pool = new Pool(poolConfig);

// 4. Listener de Erros (Evita crash do Node em erros de idle)
pool.on('error', (err) => {
    console.error('❌ Erro inesperado no Pool do Banco:', err.message);
});

module.exports = pool;
