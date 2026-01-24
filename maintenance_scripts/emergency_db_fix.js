const db = require('../database/db');
const bcrypt = require('bcryptjs');

async function repairDatabase() {
    console.log('�� INICIANDO PROTOCOLO DE REPARO DE EMERGÊNCIA...');

    try {
        // 1. Diagnóstico da Tabela Users
        const resColumns = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        
        const columns = resColumns.rows.map(r => r.column_name);
        console.log('��� Colunas detectadas:', columns.join(', '));

        // 2. Correção Estrutural (Schema)
        if (!columns.includes('password')) {
            if (columns.includes('password_hash')) {
                console.log('⚠️ Coluna "password_hash" encontrada. Renomeando para "password" para compatibilidade...');
                await db.query('ALTER TABLE users RENAME COLUMN password_hash TO password;');
            } else {
                console.log('⚠️ Coluna "password" inexistente. Criando coluna...');
                await db.query('ALTER TABLE users ADD COLUMN password TEXT;');
            }
            console.log('✅ Schema corrigido: Coluna "password" garantida.');
        } else {
            console.log('✅ Schema íntegro: Coluna "password" já existe.');
        }

        // 3. Sanitização de Dados (Data Integrity)
        // Define senha padrão '123456' para qualquer usuário com senha NULA ou VAZIA
        const defaultHash = await bcrypt.hash('123456', 10);
        
        const updateRes = await db.query(`
            UPDATE users 
            SET password = $1 
            WHERE password IS NULL OR password = '' OR password = 'undefined'
            RETURNING id, email;
        `, [defaultHash]);

        if (updateRes.rowCount > 0) {
            console.log(`��� ${updateRes.rowCount} usuários corrompidos foram reparados com a senha '123456'.`);
            updateRes.rows.forEach(u => console.log(`   -> Reparado: ${u.email}`));
        } else {
            console.log('✨ Nenhum usuário corrompido encontrado após verificação.');
        }

        console.log('��� PROTOCOLO FINALIZADO COM SUCESSO.');
        process.exit(0);

    } catch (err) {
        console.error('❌ FALHA NO PROTOCOLO:', err);
        process.exit(1);
    }
}

repairDatabase();
