const db = require('../database/db');

async function cleanupUsersSchema() {
    console.log("Iniciando limpeza de colunas duplicadas na tabela users...");

    try {
        // 1. Migrar dados existentes em 'users' para 'clients' caso 'clients' esteja vazio nesses campos
        // Isso garante que não perderemos o peso/altura de quem se cadastrou mas não preencheu a anamnese ainda
        console.log("Migrando dados órfãos de users para clients...");
        
        // Garante que todo user tipo 'client' tenha uma entrada na tabela clients
        await db.query(`
            INSERT INTO clients (user_id, created_at)
            SELECT u.id, NOW()
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.role = 'client' AND c.id IS NULL;
        `);

        // Atualiza clients com dados que estavam em users (apenas se clients estiver null)
        await db.query(`
            UPDATE clients c
            SET 
                current_weight = COALESCE(c.current_weight, u.weight::varchar),
                height = COALESCE(c.height, u.height::varchar),
                fitness_goals = COALESCE(c.fitness_goals, u.goal),
                fitness_level = COALESCE(c.fitness_level, u.fitness_level)
            FROM users u
            WHERE c.user_id = u.id
            AND (c.current_weight IS NULL OR c.height IS NULL);
        `);

        // 2. Remover as colunas duplicadas da tabela users
        const columnsToDrop = ['weight', 'height', 'goal', 'fitness_level', 'age']; // 'age' também deve ficar em clients
        
        for (const col of columnsToDrop) {
            // Verifica se a coluna existe antes de tentar dropar
            const check = await db.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name=$1;
            `, [col]);

            if (check.rows.length > 0) {
                await db.query(`ALTER TABLE users DROP COLUMN ${col};`);
                console.log(`Coluna removida de users: ${col}`);
            }
        }

        console.log("Sucesso! Tabela users limpa e dados migrados para clients.");

    } catch (err) {
        console.error("Erro na migração:", err);
    } finally {
        process.exit();
    }
}

cleanupUsersSchema();
