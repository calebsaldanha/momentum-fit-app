// 1. Garantir que variáveis de ambiente estejam carregadas ANTES de tudo
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { Pool } = require('pg');

// 2. Diagnóstico de Conexão (Sem vazar senha)
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("❌ ERRO FATAL: DATABASE_URL não está definida.");
    console.error("   Verifique o arquivo .env ou as variáveis da Vercel.");
    // Em produção, isso deve falhar o build
    if (process.env.NODE_ENV === 'production') process.exit(1);
} else {
    const maskedUrl = dbUrl.replace(/:([^:@]{1,})@/, ':****@');
    console.log(`��� Inicializando Pool de Conexão com: ${maskedUrl}`);
}

// 3. Configuração do Pool
const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }, // Obrigatório para Neon/Vercel
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('❌ Erro inesperado no cliente do banco', err);
});

module.exports = pool;
