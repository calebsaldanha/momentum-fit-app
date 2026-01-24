const db = require('../database/db');
const bcrypt = require('bcryptjs');

async function fixSessionAndUser() {
    console.log('Ì¥ß Iniciando reparo de Sess√£o e Auth...');

    try {
        // 1. Criar tabela de sess√£o (Obrigat√≥ria para connect-pg-simple)
        console.log('Ì≥¶ Verificando/Criando tabela de sess√£o...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS "session" (
              "sid" varchar NOT NULL COLLATE "default",
              "sess" json NOT NULL,
              "expire" timestamp(6) NOT NULL
            )
            WITH (OIDS=FALSE);

            ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `).catch(err => {
            if (!err.message.includes('already exists')) throw err;
            console.log('‚ÑπÔ∏è Tabela session j√° existe ou constraints j√° aplicadas.');
        });
        console.log('‚úÖ Tabela de sess√£o configurada.');

        // 2. Resetar senha do usu√°rio admin/teste
        const emailAlvo = 'mrnsldnh@gmail.com';
        const novaSenha = '123456';
        const hash = await bcrypt.hash(novaSenha, 10);

        console.log(`Ì¥ë Resetando senha para: ${emailAlvo}...`);
        
        // Verifica se usu√°rio existe
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [emailAlvo]);
        
        if (userCheck.rows.length === 0) {
            console.log('‚ö†Ô∏è Usu√°rio n√£o encontrado. Criando usu√°rio de emerg√™ncia...');
            await db.query(`
                INSERT INTO users (name, email, password, role) 
                VALUES ('Caleb Admin', $1, $2, 'client')
            `, [emailAlvo, hash]);
        } else {
            await db.query(`
                UPDATE users SET password = $1 WHERE email = $2
            `, [hash, emailAlvo]);
        }
        
        console.log('‚úÖ Senha definida para "123456".');
        console.log('Ì∫Ä Sistema pronto. Tente fazer login novamente.');
        process.exit(0);

    } catch (err) {
        console.error('‚ùå Erro Fatal:', err);
        process.exit(1);
    }
}

fixSessionAndUser();
