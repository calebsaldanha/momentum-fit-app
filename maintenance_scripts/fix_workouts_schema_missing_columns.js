const db = require('../database/db');

async function fixWorkoutsSchema() {
  try {
    console.log('Iniciando correção do schema da tabela workouts...');

    // Adiciona a coluna day_of_week se não existir
    await db.query(`
      ALTER TABLE workouts 
      ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(50) DEFAULT NULL;
    `);
    console.log('✅ Coluna "day_of_week" verificada/adicionada.');

    // Prevenção: verificar também description que é usada no mesmo insert
    await db.query(`
      ALTER TABLE workouts 
      ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
    `);
    console.log('✅ Coluna "description" verificada/adicionada.');

    console.log('Schema corrigido com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao corrigir schema:', err);
  } finally {
    // Encerra o processo para não travar o terminal
    process.exit();
  }
}

fixWorkoutsSchema();
