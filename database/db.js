const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error("❌ CRITICAL: DATABASE_URL is missing. Application will try to connect to localhost and likely fail on Vercel.");
} else {
    console.log("✅ Database connection string found (hidden for security).");
}

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = {
    connectionString: connectionString,
    ssl: isProduction || (connectionString && connectionString.includes('sslmode')) 
        ? { rejectUnauthorized: false } 
        : false
};

const pool = new Pool(poolConfig);

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool: pool
};
