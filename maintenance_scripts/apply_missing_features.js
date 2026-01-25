require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../database/update_missing_features.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Tabelas de Artigos e Planos atualizadas com sucesso.');
    } catch (err) {
        console.error('❌ Erro ao atualizar DB:', err);
    } finally {
        await pool.end();
    }
}

run();
