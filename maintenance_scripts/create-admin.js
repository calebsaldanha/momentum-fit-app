require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function createAdmin() {
  const name = "Admin";
  const email = "calebsaldanhawork@gmail.com"; 
  const password = "Nascimento12@"; 
  const role = "superadmin";
  const status = "active";

  try {
    // Criptografa a senha (obrigat√≥rio)
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('‚è≥ Conectando ao banco e criando usu√°rio...');

    const query = `
      INSERT INTO users (name, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, name, email, role;
    `;

    const res = await pool.query(query, [name, email, hashedPassword, role, status]);

    if (res.rows.length > 0) {
      console.log("‚úÖ Sucesso! Usu√°rio Super Admin criado:");
      console.log("--------------------------------------");
      console.log("Ì±§ Nome: " + res.rows[0].name);
      console.log("Ì≥ß Email: " + res.rows[0].email);
      console.log("Ì¥ë Senha: " + password);
      console.log("Ìª°Ô∏è  Role: " + res.rows[0].role);
      console.log("--------------------------------------");
    } else {
      console.log("‚ö†Ô∏è  O email '" + email + "' j√° existe no banco de dados.");
      console.log("Se quiser torn√°-lo admin, voc√™ precisar√° alterar a role manualmente ou deletar o usu√°rio antigo.");
    }

  } catch (err) {
    console.error("‚ùå Erro ao criar usu√°rio:", err);
  } finally {
    await pool.end();
  }
}

createAdmin();
