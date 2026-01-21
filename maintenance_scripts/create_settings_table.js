const db = require('../database/db');
async function run() {
    await db.query(`CREATE TABLE IF NOT EXISTS system_settings (key VARCHAR(50) PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT NOW());`);
    const defaults = [
        { k: 'pix_key', v: 'admin@momentum.com' },
        { k: 'site_home_title', v: 'Energia Pura.' },
        { k: 'site_about_text', v: 'Sobre nós...' }
    ];
    for (const d of defaults) {
        await db.query(`INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [d.k, d.v]);
    }
    console.log('Settings table ready.');
    process.exit();
}
run();
