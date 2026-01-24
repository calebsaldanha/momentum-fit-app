const { Pool } = require('pg');
require('dotenv').config();

// 1. ANÁLISE DEFENSIVA DA URL
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERRO FATAL: DATABASE_URL não definida no ambiente.");
    // Em produção, isso deve parar o app. Em dev, pode ser erro de configuração.
    if (process.env.NODE_ENV === 'production') process.exit(1);
}

/**
 * 2. SANITIZAÇÃO DA STRING DE CONEXÃO
 * O aviso 'SECURITY WARNING' ocorre porque a string contém 'sslmode=require'.
 * O driver node-pg sugere usar 'verify-full' ou configurar via objeto.
 * Vamos remover o parâmetro da string e forçar via objeto para controle total.
 */
if (connectionString && connectionString.includes('sslmode=require')) {
    // Removemos o parâmetro depreciado da string para evitar o log de aviso
    connectionString = connectionString.replace(/(\?|&)sslmode=require/, '');
}

/**
 * 3. CONFIGURAÇÃO ROBUSTA DO POOL
 * - ssl: { rejectUnauthorized: true } -> Equivalente a 'verify-full'.
 * Garante que estamos falando com a Neon/AWS real e não um interceptador.
 * Neon usa certificados Let's Encrypt (Web PKI), então o sistema operacional confia nativamente.
 * * - timeouts: Evitam que o app fique carregando infinitamente se o banco travar.
 */
const poolConfig = {
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: true, // Segurança Máxima (Produção)
    },
    connectionTimeoutMillis: 5000, // 5s para conectar ou falhar (Evita loading infinito)
    idleTimeoutMillis: 30000,      // Fecha conexões ociosas após 30s
    max: process.env.NODE_ENV === 'production' ? 10 : 5 // Limite conexões no serverless
};

// Fallback para ambiente local sem SSL (caso você use um Postgres local no futuro)
if (connectionString && connectionString.includes('localhost')) {
    delete poolConfig.ssl;
}

const pool = new Pool(poolConfig);

// 4. MONITORAMENTO DE ERROS DO POOL (CRÍTICO)
// Se o pool perder a conexão, isso evita que o Node.js crashe totalmente sem log.
pool.on('error', (err, client) => {
    console.error('��� Erro inesperado no Pool de Conexão (Idle Client):', err.message);
    // Não sair do processo aqui (process.exit), tentar recuperar.
});

// Teste imediato de sanidade ao carregar o módulo
if (process.env.NODE_ENV !== 'test') {
    // Apenas loga a configuração (sem vazar a senha)
    const sanitizedUrl = connectionString ? connectionString.split('@')[1] : 'N/A';
    console.log(`��� Configurando DB Pool para: ...${sanitizedUrl}`);
    console.log(`��� Modo SSL: ${poolConfig.ssl ? 'ATIVO (Strict)' : 'INATIVO'}`);
}

module.exports = pool;
