require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function createSessionTable() {
  console.log("‚è≥ Conectando ao banco de dados para criar tabela de sess√µes...");
  
  const query = `
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    )
    WITH (OIDS=FALSE);

    ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `;

  try {
    await pool.query(query);
    console.log("‚úÖ Tabela 'session' criada com sucesso!");
    console.log("Ì∫Ä Agora o login deve funcionar e manter voc√™ logado.");
  } catch (err) {
    console.error("‚ùå Erro ao criar tabela:", err);
  } finally {
    await pool.end();
  }
}

createSessionTable();
