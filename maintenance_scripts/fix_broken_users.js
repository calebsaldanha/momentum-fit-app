const db = require('../database/db');

async function fixBrokenUsers() {
    try {
        console.log('��� Iniciando limpeza de usuários corrompidos...');
        
        // Deletar usuários sem senha ou com senha vazia
        const result = await db.query(`
            DELETE FROM users 
            WHERE password IS NULL OR password = ''
        `);
        
        console.log(`✅ ${result.rowCount} usuários inválidos removidos.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro:', err);
        process.exit(1);
    }
}

fixBrokenUsers();
