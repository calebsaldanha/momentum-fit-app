const db = require('../database/db');

async function run() {
    console.log('--- ��� Iniciando Reparo do Schema de Autenticação ---');
    try {
        // 1. Verifica quais colunas existem na tabela users
        const res = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log('��� Colunas atuais:', columns.join(', '));

        // 2. Cenário A: Existe 'password' mas não 'password_hash' -> RENOMEAR
        if (columns.includes('password') && !columns.includes('password_hash')) {
            console.log('⚠️ Coluna antiga "password" detectada. Renomeando para "password_hash"...');
            await db.query(`ALTER TABLE users RENAME COLUMN password TO password_hash;`);
            console.log('✅ Coluna renomeada com sucesso.');
        }
        
        // 3. Cenário B: Não existe nenhuma das duas -> CRIAR
        else if (!columns.includes('password_hash')) {
            console.log('⚠️ Nenhuma coluna de senha encontrada. Criando "password_hash"...');
            await db.query(`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);`);
            console.log('✅ Coluna criada.');
        } else {
            console.log('✅ A coluna "password_hash" já existe e está correta.');
        }

        console.log('--- ��� Correção Concluída ---');
        process.exit(0);
    } catch (e) {
        console.error('❌ Erro no script:', e);
        process.exit(1);
    }
}

run();
