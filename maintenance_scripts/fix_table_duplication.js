const db = require('../database/db');

async function fixTableDuplication() {
    console.log("Ìª†Ô∏è Iniciando limpeza de tabelas duplicadas...");

    try {
        // 1. Verificar se 'client_profiles' existe
        const check = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'client_profiles'
            );
        `);

        if (check.rows[0].exists) {
            console.log("‚ö†Ô∏è Tabela 'client_profiles' encontrada. Migrando dados para 'clients'...");

            // Tenta migrar dados de perfis √≥rf√£os para a tabela oficial 'clients'
            // Apenas se o user_id ainda n√£o existir em 'clients'
            await db.query(`
                INSERT INTO clients (user_id, phone, current_weight, height, fitness_goals, injuries, medications, created_at)
                SELECT user_id, phone, current_weight, height, fitness_goals, injuries, medications, created_at
                FROM client_profiles
                WHERE user_id NOT IN (SELECT user_id FROM clients);
            `);
            
            // Remove a tabela antiga
            await db.query("DROP TABLE client_profiles;");
            console.log("Ì∑ëÔ∏è Tabela 'client_profiles' removida com sucesso.");
        } else {
            console.log("‚úÖ Tabela 'client_profiles' n√£o existe. Nenhuma a√ß√£o necess√°ria.");
        }

        // 2. Garantir que client_profile_history existe (pois √© √∫til para logs)
        await db.query(`
            CREATE TABLE IF NOT EXISTS client_profile_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                profile_snapshot JSONB,
                changed_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("‚úÖ Tabela 'client_profile_history' verificada/criada.");

        console.log("ÌøÅ Limpeza de banco de dados conclu√≠da!");

    } catch (err) {
        console.error("‚ùå Erro durante a limpeza:", err);
    } finally {
        process.exit();
    }
}

fixTableDuplication();
