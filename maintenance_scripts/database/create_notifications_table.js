const { pool } = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Verificando tabela de notificações...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        link TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tabela notifications verificada/criada com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao criar tabela:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
