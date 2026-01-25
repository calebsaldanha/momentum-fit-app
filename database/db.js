// Carregar variáveis de ambiente se não estiver em produção
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { Pool } = require('pg');

// ���️ FALLBACK STRATEGY:
// Tenta DATABASE_URL (Padrão) -> Tenta POSTGRES_URL (Vercel) -> Falha
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!dbUrl) {
    console.error("❌ FATAL: Nenhuma URL de banco de dados encontrada.");
    console.error("   Verifique se 'DATABASE_URL' ou 'POSTGRES_URL' estão definidas.");
    
    // Em produção, isso deve falhar o build para alertar o dev
    if (process.env.NODE_ENV === 'production') process.exit(1);
}

// Detecção robusta de SSL
// Se a URL contém 'localhost' ou '127.0.0.1', desativa SSL.
// Caso contrário (Neon, Vercel Postgres, AWS), FORÇA SSL.
const isLocalhost = dbUrl && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1'));
const sslConfig = isLocalhost ? false : { rejectUnauthorized: false };

console.log(`��� DB Connection: ${isLocalhost ? 'Local (No SSL)' : 'Remote (SSL Active)'}`);

const pool = new Pool({
    connectionString: dbUrl,
    ssl: sslConfig,
    max: 10, // Pool size seguro para Vercel
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('❌ Erro inesperado no pool do banco:', err);
    // Não mata o processo, permite retry
});

module.exports = pool;
