require('dotenv').config();
const pool = require('./db');

(async () => {
    console.log("Ì¥ß Iniciando reparo da tabela de sess√£o...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Verifica se a tabela existe
        const res = await client.query("SELECT to_regclass('public.session')");
        if (res.rows[0].to_regclass) {
            console.log("‚ö†Ô∏è Tabela 'session' j√° existe. Verificando integridade...");
            // Opcional: Truncar para limpar sess√µes travadas (Descomente se necess√°rio)
            // await client.query('TRUNCATE TABLE "session"'); 
        } else {
            console.log("‚ú® Criando tabela 'session' do zero...");
            await client.query(`
                CREATE TABLE "session" (
                  "sid" varchar NOT NULL COLLATE "default",
                  "sess" json NOT NULL,
                  "expire" timestamp(6) NOT NULL
                )
                WITH (OIDS=FALSE);
                
                ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
                CREATE INDEX "IDX_session_expire" ON "session" ("expire");
            `);
            console.log("‚úÖ Tabela criada com sucesso.");
        }
        
        await client.query('COMMIT');
        console.log("ÌøÅ Reparo conclu√≠do.");
        process.exit(0);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Ì¥• Erro ao reparar tabela:", e);
        process.exit(1);
    } finally {
        client.release();
    }
})();
