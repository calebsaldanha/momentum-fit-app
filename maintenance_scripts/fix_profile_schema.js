const db = require('../database/db');

async function fixSchema() {
    try {
        console.log("Ì¥ß Iniciando reparo do Schema para Perfil...");
        await db.query('BEGIN');

        // 1. Adicionar colunas faltantes na tabela USERS
        const userColumns = [
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT'
        ];

        for (const query of userColumns) {
            await db.query(query);
            console.log(`‚úÖ Users: ${query.replace('ALTER TABLE users ADD COLUMN IF NOT EXISTS ', '')} verificado.`);
        }

        // 2. Adicionar colunas faltantes na tabela CLIENTS (Garantia)
        const clientColumns = [
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS height NUMERIC(3,2)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS goal TEXT',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS fitness_goals TEXT',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS medical_history TEXT',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS medications TEXT',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS injuries TEXT',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS available_equipment TEXT',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS activity_level TEXT',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS stress_level INTEGER DEFAULT 1',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS sleep_quality TEXT',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS water_intake TEXT',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS body_measurements JSONB DEFAULT \'{}\''
        ];

        for (const query of clientColumns) {
            await db.query(query);
            console.log(`‚úÖ Clients: ${query.replace('ALTER TABLE clients ADD COLUMN IF NOT EXISTS ', '')} verificado.`);
        }

        await db.query('COMMIT');
        console.log("Ì∫Ä Corre√ß√£o conclu√≠da com sucesso!");
        process.exit(0);

    } catch (error) {
        await db.query('ROLLBACK');
        console.error("‚ùå Erro ao corrigir schema:", error);
        process.exit(1);
    }
}

fixSchema();
