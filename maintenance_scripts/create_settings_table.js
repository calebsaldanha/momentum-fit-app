const db = require('../database/db');

async function run() {
    try {
        console.log('Criando tabela system_settings...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Seed inicial se não existir
        const defaults = [
            { key: 'pix_key', value: '00000000-0000-0000-0000-000000000000' },
            { key: 'site_home_title', value: 'Energia Pura. Resultados Reais.' },
            { key: 'site_about_text', value: 'Sobre a Momentum Fit...' },
            { key: 'site_contact_email', value: 'admin@momentumfitness.com.br' }
        ];

        for (const d of defaults) {
            await db.query(`
                INSERT INTO system_settings (key, value) VALUES ($1, $2)
                ON CONFLICT (key) DO NOTHING
            `, [d.key, d.value]);
        }

        console.log('Tabela system_settings pronta.');
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
