const { Pool } = require('pg');
require('dotenv').config();

// Configuração SSL robusta para Vercel/Neon/Render
const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = {
    connectionString: process.env.DATABASE_URL,
};

// Se estiver em produção ou se a URL do banco exigir SSL (comum em nuvem)
if (isProduction || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode'))) {
    poolConfig.ssl = {
        rejectUnauthorized: false // Permite conexões com certificados autoassinados (padrão em muitos DBs as a Service)
    };
}

const pool = new Pool(poolConfig);

// Tratamento de erros do Pool para evitar crash da aplicação
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Não sair do processo aqui, apenas logar
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect()
};
