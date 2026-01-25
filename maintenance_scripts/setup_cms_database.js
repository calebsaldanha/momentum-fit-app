const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const initialData = [
    // --- HOME PAGE ---
    { page: 'home', section: 'hero', key: 'title_line1', value: 'Seu Corpo.' },
    { page: 'home', section: 'hero', key: 'title_line2', value: 'Sua Obra.' },
    { page: 'home', section: 'hero', key: 'subtitle', value: 'A plataforma definitiva que une Intelig√™ncia Artificial e metodologia de elite para transformar seu potencial gen√©tico em realidade f√≠sica.' },
    { page: 'home', section: 'hero', key: 'cta_primary', value: 'Come√ßar Agora' },
    { page: 'home', section: 'features', key: 'card1_title', value: 'IA Adaptativa' },
    { page: 'home', section: 'features', key: 'card1_text', value: 'Algoritmos que ajustam carga e volume treino a treino.' },
    
    // --- ABOUT PAGE ---
    { page: 'about', section: 'intro', key: 'title', value: 'A Ci√™ncia da Performance' },
    { page: 'about', section: 'mission', key: 'text', value: 'Democratizar o acesso a metodologias antes restritas a atletas ol√≠mpicos, usando dados para eliminar o "achismo" do treinamento.' },
    
    // --- PLANS ---
    { page: 'plans', section: 'free', key: 'price', value: '0' },
    { page: 'plans', section: 'pro', key: 'price', value: '89' },
    { page: 'plans', section: 'vip', key: 'price', value: '249' }
];

async function setup() {
    try {
        console.log('Ì≥¶ Criando tabela site_content...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS site_content (
                id SERIAL PRIMARY KEY,
                page VARCHAR(50) NOT NULL,
                section VARCHAR(50) NOT NULL,
                key VARCHAR(100) NOT NULL,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(page, section, key)
            );
        `);

        console.log('Ì≥ù Populando dados iniciais...');
        
        for (const item of initialData) {
            await pool.query(`
                INSERT INTO site_content (page, section, key, value)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (page, section, key) 
                DO UPDATE SET value = EXCLUDED.value;
            `, [item.page, item.section, item.key, item.value]);
        }

        console.log('‚úÖ CMS Configurado com sucesso.');
    } catch (error) {
        console.error('‚ùå Erro:', error);
    } finally {
        pool.end();
    }
}

setup();
