const db = require('../database/db');

async function run() {
    console.log('Verificando tabela ai_audit_logs...');
    await db.query(`
        CREATE TABLE IF NOT EXISTS ai_audit_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            action VARCHAR(100),
            details TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
    console.log('Tabela ai_audit_logs garantida.');
    process.exit();
}
run();
