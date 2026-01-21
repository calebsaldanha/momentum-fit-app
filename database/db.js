const { Pool } = require('pg');
require('dotenv').config();

// Tenta pegar URL padrão ou específica do Vercel
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const isProduction = process.env.NODE_ENV === 'production';

// Configuração de conexão
const poolConfig = {
    connectionString: connectionString,
    // SSL é obrigatório para Vercel/Neon, mesmo em dev. 
    // Se não tiver connectionString, não define SSL para evitar crash imediato (vai dar erro de conexão depois)
    ssl: connectionString ? { rejectUnauthorized: false } : false,
    max: 20, // Limite de conexões
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Timeout mais rápido para não travar o app
};

if (!connectionString) {
    console.error("❌ ERRO CRÍTICO: 'DATABASE_URL' não encontrada nas variáveis de ambiente.");
    console.error("   -> Se estiver local: Verifique se o arquivo .env existe e tem a chave DATABASE_URL.");
    console.error("   -> Se estiver na Vercel: Verifique em Settings > Environment Variables.");
} else {
    // Oculta a senha nos logs para segurança
    const hiddenUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log(`✅ Tentando conectar ao Banco de Dados: ${hiddenUrl}`);
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    // Log silencioso para evitar poluição em produção, útil em debug
    if (!isProduction) console.log('��� Nova conexão com o banco estabelecida.');
});

pool.on('error', (err) => {
    console.error('❌ Erro inesperado na Pool do Postgres:', err);
    // Não encerra o processo, permite retentativa
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool: pool
};
