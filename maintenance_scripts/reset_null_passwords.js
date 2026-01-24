const db = require('../database/db');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
    try {
        console.log('�� Iniciando reparo de senhas corrompidas...');
        
        // Hash padrão: 123456
        const defaultHash = await bcrypt.hash('123456', 10);
        
        // Atualiza usuário específico e qualquer outro que esteja NULL
        const result = await db.query(`
            UPDATE users 
            SET password = $1 
            WHERE (email = 'mrnsldnh@gmail.com' OR password IS NULL OR password = '')
            RETURNING id, email
        `, [defaultHash]);
        
        if (result.rowCount > 0) {
            console.log(`✅ Sucesso! Senhas resetadas para '123456' nos seguintes usuários:`);
            result.rows.forEach(u => console.log(`   - ID: ${u.id} | Email: ${u.email}`));
        } else {
            console.log('ℹ️ Nenhuma conta precisou de reparo.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Erro crítico ao resetar senhas:', err);
        process.exit(1);
    }
}

resetPasswords();
