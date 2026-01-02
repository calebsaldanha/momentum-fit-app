require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function createCheckinsTable() {
  console.log("⏳ Criando tabela 'checkins'...");

  const query = `
    CREATE TABLE IF NOT EXISTS checkins (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      date TIMESTAMP DEFAULT NOW(),
      weight NUMERIC(5,2),
      waist NUMERIC(5,2),
      hip NUMERIC(5,2),
      chest NUMERIC(5,2),
      arm NUMERIC(5,2),
      thigh NUMERIC(5,2),
      calf NUMERIC(5,2),
      notes TEXT,
      photos JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    await pool.query(query);
    console.log("✅ Tabela 'checkins' criada com sucesso!");
    
    // Inserir um checkin de teste se a tabela estiver vazia
    const checkCount = await pool.query("SELECT COUNT(*) FROM checkins");
    if (parseInt(checkCount.rows[0].count) === 0) {
        // Pega o primeiro cliente disponível
        const client = await pool.query("SELECT id FROM users WHERE role = 'client' LIMIT 1");
        if (client.rows.length > 0) {
            await pool.query(
                "INSERT INTO checkins (user_id, weight, notes) VALUES ($1, 70.0, 'Check-in inicial de teste')",
                [client.rows[0].id]
            );
            console.log(" Check-in de teste inserido.");
        }
    }

  } catch (err) {
    console.error("❌ Erro ao criar tabela:", err);
  } finally {
    await pool.end();
  }
}

createCheckinsTable();
