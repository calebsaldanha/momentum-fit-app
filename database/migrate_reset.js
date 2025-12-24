const { pool } = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migração de recuperação de senha...');
    
    // Adiciona colunas se não existirem
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
      ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;
    `);
    
    console.log('✅ Colunas de recuperação de senha adicionadas com sucesso.');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
