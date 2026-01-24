const { Pool } = require('pg');
require('dotenv').config();

/**
 * 1. ANÁLISE DEFENSIVA DA URL COM FALLBACK
 * Problema detectado: O ambiente (Vercel/Neon) ou .env pode fornecer POSTGRES_URL, 
 * mas o código esperava DATABASE_URL.
 * Solução: Aceitar ambos, priorizando DATABASE_URL se existir.
 */
let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error("❌ ERRO FATAL: Nenhuma string de conexão encontrada.");
    console.error("ℹ️  Esperado: DATABASE_URL ou POSTGRES_URL.");
    
    // Diagnóstico para QA/Dev: O dotenv carregou algo ou está vazio?
    if (process.env.NODE_ENV !== 'production') {
        const envKeys = Object.keys(process.env);
        console.error(`��� DEBUG AMBIENTE: ${envKeys.length} variáveis carregadas.`);
        if (envKeys.length < 5) {
             console.error("⚠️  ALERTA: Poucas variáveis detectadas. O arquivo .env está na raiz correta?");
        }
    }

    // Regra de Ouro: Fail Fast. Se não tem banco, não sobe.
    if (process.env.NODE_ENV === 'production') {
        console.error("��� Abortando em produção por segurança.");
        process.exit(1);
    }
}

/**
 * 2. SANITIZAÇÃO DA STRING DE CONEXÃO
 * Remove parâmetros depreciados que causam warnings no driver pg
 */
if (connectionString && connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace(/(\?|&)sslmode=require/, '');
}

/**
 * 3. CONFIGURAÇÃO ROBUSTA DO POOL
 * Garante SSL real (verify-full logic) e timeouts defensivos.
 */
const poolConfig = {
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: true, // Segurança Máxima (Produção)
    },
    connectionTimeoutMillis: 5000, // 5s para conectar ou falhar (Fail Fast)
    idleTimeoutMillis: 30000,      // Libera recursos ociosos
    max: process.env.NODE_ENV === 'production' ? 10 : 5 // Rate limiting de conexões
};

// Fallback para ambiente local (localhost) sem SSL
if (connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'))) {
    console.warn("⚠️  Modo Local detectado: Desativando SSL estrito.");
    delete poolConfig.ssl;
}

const pool = new Pool(poolConfig);

// 4. MONITORAMENTO DE ERROS DO POOL (CRÍTICO)
pool.on('error', (err, client) => {
    console.error('��� Erro inesperado no Pool de Conexão (Idle Client):', err.message);
    // Não sair do processo aqui, permite retry automático do driver
});

// Teste de Sanidade na Inicialização
if (process.env.NODE_ENV !== 'test') {
    const sanitizedUrl = connectionString ? '***' + connectionString.slice(connectionString.lastIndexOf('@')) : 'N/A';
    console.log(`✅ DB Configurado com: ${process.env.DATABASE_URL ? 'DATABASE_URL' : 'POSTGRES_URL'}`);
    console.log(`��� SSL Mode: ${poolConfig.ssl ? 'ATIVO (Strict)' : 'INATIVO (Local)'}`);
}

module.exports = pool;
