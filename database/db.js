const { Pool } = require('pg');
require('dotenv').config();

/**
 * ���️ 1. NORMALIZAÇÃO DE AMBIENTE (DATABASE_URL vs POSTGRES_URL)
 * O problema original: Vercel injeta POSTGRES_URL, mas o código esperava DATABASE_URL.
 * Solução: Fallback em cascata.
 */
let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Debug seguro para QA (Não vaza a senha, mas mostra o que tem)
if (process.env.NODE_ENV !== 'production') {
    if (!connectionString) {
        console.error("⚠️ DEBUG: Nenhuma string de conexão encontrada.");
        console.error("ℹ️ Variáveis carregadas:", Object.keys(process.env).filter(k => k.includes('URL') || k.includes('DB')));
    }
}

if (!connectionString) {
    console.error("❌ ERRO FATAL: Banco de dados não configurado.");
    console.error("   Ação: Verifique se .env existe ou se as variáveis da Vercel estão linkadas.");
    
    // Fail Fast: Não deixe o app subir "bêbado". Derrube o processo.
    process.exit(1);
}

/**
 * ���️ 2. SANITIZAÇÃO DE SSL (O "Killer" de conexões Neon)
 * Drivers recentes do PG odeiam 'sslmode=require' na string quando você passa config de objeto.
 * Removemos da string e forçamos no objeto.
 */
if (connectionString.includes('sslmode=')) {
    connectionString = connectionString.replace(/(\?|&)sslmode=([^&]*)/, '');
}

// Detecção de ambiente local real (localhost ou IP local)
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

/**
 * ���️ 3. CONFIGURAÇÃO DEFENSIVA DO POOL
 */
const poolConfig = {
    connectionString: connectionString,
    // SSL Estrito em Prod, Desligado em Localhost (evita erro de self-signed local)
    ssl: isLocalhost ? false : { rejectUnauthorized: true },
    connectionTimeoutMillis: 5000, // 5s para conectar ou falhar (Fail Fast)
    idleTimeoutMillis: 30000,      // Mata conexões zumbis
    max: process.env.NODE_ENV === 'production' ? 10 : 5 // Rate limit para Serverless
};

const pool = new Pool(poolConfig);

/**
 * ���️ 4. MONITORAMENTO DE ERROS (Circuit Breaker)
 * Se o pool perder a conexão com o Neon, o app deve saber, não ficar pendurado.
 */
pool.on('error', (err) => {
    console.error('��� CRÍTICO: Erro inesperado no cliente do Pool de Conexão:', err.message);
    // Não damos exit(1) aqui para não derrubar o servidor por um soluço de rede,
    // mas o log é obrigatório para monitoramento.
});

// Teste de Sanidade na Inicialização (Apenas Log)
if (process.env.NODE_ENV !== 'test') {
    const dbType = process.env.DATABASE_URL ? 'DATABASE_URL' : (process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'UNKNOWN');
    console.log(`✅ DB Conectado via [${dbType}] | SSL: ${poolConfig.ssl ? 'ATIVO' : 'OFF (Local)'}`);
}

module.exports = pool;
