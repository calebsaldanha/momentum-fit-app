require('dotenv').config();
const db = require('../database/db');

async function run() {
    console.log("��� Verificando planos...");
    try {
        const res = await db.query("SELECT count(*) FROM plans");
        if (parseInt(res.rows[0].count) === 0) {
            console.log("⚠️ Nenhum plano encontrado. Criando padrões...");
            await db.query(`
                INSERT INTO plans (name, price, description, features, is_active) VALUES 
                ('Gratuito', 0.00, 'Plano de entrada', 'Acesso limitado ao app', true),
                ('Mensal Básico', 89.90, 'Treino personalizado', 'Treino, Chat', true),
                ('Trimestral Pro', 249.90, 'Acompanhamento completo', 'Treino, Dieta, Chat 24h', true)
            `);
            console.log("✅ Planos criados.");
        } else {
            console.log(`✅ ${res.rows[0].count} planos já existem.`);
        }
    } catch (e) {
        console.error("Erro:", e);
    } finally {
        process.exit();
    }
}
run();
