require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function migrate() {
  console.log("⏳ Atualizando schema para suportar imagens...");
  try {
    // 1. Garante que a library existe (caso não tenha rodado o seed ainda)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exercise_library (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        image_url TEXT,
        video_url TEXT,
        description TEXT
      );
    `);

    // 2. Adiciona coluna image_url na tabela de exercícios do treino
    await pool.query(`
      ALTER TABLE workout_exercises 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);

    console.log("✅ Schema atualizado com sucesso!");
    console.log("OBS: Não esqueça de rodar seu script 'seed_exercises_blob.js' para popular a biblioteca com as imagens do Vercel!");
  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await pool.end();
  }
}

migrate();
