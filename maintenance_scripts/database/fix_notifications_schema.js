const { pool } = require('./db');

async function fixSchema() {
  const client = await pool.connect();
  try {
    console.log('���️  Iniciando correção da tabela notifications...');
    
    // Remove a tabela antiga incorreta
    console.log('1. Removendo tabela antiga...');
    await client.query('DROP TABLE IF EXISTS notifications');

    // Cria a tabela nova com TODAS as colunas necessárias
    console.log('2. Criando nova tabela com esquema correto...');
    await client.query(`
      CREATE TABLE notifications (
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
    
    console.log('✅ Tabela notifications recriada com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao corrigir tabela:', err);
  } finally {
    client.release();
    // Encerra o processo para liberar o terminal
    process.exit();
  }
}

fixSchema();
