const { Pool } = require('pg');
require('dotenv').config();

// 1. Determina a Connection String (Prioriza POSTGRES_URL do Neon)
let connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
    // Em produção, isso deve falhar o build/boot
    if (process.env.NODE_ENV === 'production') {
        throw new Error("❌ CRITICAL: DATABASE_URL/POSTGRES_URL missing.");
    }
    console.warn("⚠️  WARN: Running without DB connection string.");
}

// 2. Limpeza da String para evitar conflitos do 'pg'
// O driver 'pg' as vezes se confunde se passarmos objeto SSL + ?sslmode na URL
if (connectionString && connectionString.includes('?sslmode=')) {
    connectionString = connectionString.split('?')[0]; // Remove query params para configurar manualmente
}

// 3. Configuração Otimizada para Vercel/Serverless
const poolConfig = {
    connectionString: connectionString,
    // SERVERLESS VITAL: Manter max baixo (1) pois cada lambda abre sua própria conexão.
    max: 1, 
    // Timeout curto para não deixar a página carregando eternamente se o banco cair
    connectionTimeoutMillis: 3000, 
    idleTimeoutMillis: 1000,
    ssl: {
        rejectUnauthorized: false // Necessário para Neon/AWS sem CA bundle customizado
    }
};

const pool = new Pool(poolConfig);

// 4. Tratamento de Erro Global do Pool (Evita crash do processo Node)
pool.on('error', (err) => {
    console.error('��� Unexpected DB Client Error:', err.message);
    // Não dar exit(1) aqui em serverless, pois mata o container quente
});

module.exports = pool;
