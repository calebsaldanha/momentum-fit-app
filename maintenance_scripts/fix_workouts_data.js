require('dotenv').config();
const { pool } = require('../database/db');

async function fixWorkouts() {
    console.log("⏳ Iniciando reparo nos dados dos treinos...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Preencher client_id baseado no user_id para treinos órfãos
        const updateClients = await client.query(`
            UPDATE workouts w
            SET client_id = c.id
            FROM clients c
            WHERE w.user_id = c.user_id 
            AND w.client_id IS NULL
        `);
        console.log(`✅ IDs de clientes corrigidos em ${updateClients.rowCount} treinos.`);

        // 2. Definir status 'pending' para treinos sem status
        const updateStatus = await client.query(`
            UPDATE workouts 
            SET status = 'pending' 
            WHERE status IS NULL
        `);
        console.log(`✅ Status 'pending' aplicado em ${updateStatus.rowCount} treinos.`);

        await client.query('COMMIT');
        console.log("��� Correção de dados concluída com sucesso!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Erro ao corrigir dados:", err);
    } finally {
        client.release();
        // Não encerramos o pool aqui se for usado por outros scripts, 
        // mas como é standalone, forçamos saída após breve delay
        setTimeout(() => process.exit(0), 1000);
    }
}

fixWorkouts();
