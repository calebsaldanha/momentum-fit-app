const { pool } = require('../database/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../database/schema_full.sql'), 'utf8');
        console.log("Aplicando schema completo...");
        await pool.query(sql);
        console.log("✅ Banco de dados atualizado e unificado!");
    } catch (e) {
        console.error("❌ Erro no schema:", e);
    } finally {
        process.exit();
    }
}
run();
