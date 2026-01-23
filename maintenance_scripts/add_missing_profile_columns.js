const db = require('../database/db');

async function addMissingColumns() {
    console.log("Ìª†Ô∏è  Iniciando cria√ß√£o de colunas espec√≠ficas para o Perfil...");

    const columns = [
        // Dados Pessoais
        "ADD COLUMN IF NOT EXISTS birth_date DATE", // Em vez de apenas age
        
        // Sa√∫de Detalhada
        "ADD COLUMN IF NOT EXISTS medications TEXT",
        "ADD COLUMN IF NOT EXISTS medical_history TEXT", // Para checkboxes de hist√≥rico
        
        // Rotina e Estilo de Vida (Antes concatenados em 'lifestyle')
        "ADD COLUMN IF NOT EXISTS occupation VARCHAR(100)",
        "ADD COLUMN IF NOT EXISTS stress_level INTEGER",
        "ADD COLUMN IF NOT EXISTS water_intake VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS sleep_hours INTEGER",
        
        // Objetivos Espec√≠ficos (Antes concatenados em 'fitness_goals')
        "ADD COLUMN IF NOT EXISTS goal_deadline VARCHAR(255)",
        "ADD COLUMN IF NOT EXISTS focus_area VARCHAR(255)",
        
        // Garantir que estes existem (do script anterior)
        "ADD COLUMN IF NOT EXISTS injuries TEXT",
        "ADD COLUMN IF NOT EXISTS surgeries TEXT",
        "ADD COLUMN IF NOT EXISTS equipment VARCHAR(100)",
        "ADD COLUMN IF NOT EXISTS training_days_frequency INTEGER"
    ];

    try {
        for (const col of columns) {
            await db.query(`ALTER TABLE clients ${col};`);
            console.log(`‚úÖ Coluna processada: ${col.replace('ADD COLUMN IF NOT EXISTS', '').split(' ')[1]}`);
        }
        console.log("Ì∫Ä Tabela clients atualizada com sucesso!");
    } catch (error) {
        console.error("‚ùå Erro ao atualizar tabela:", error);
    } finally {
        process.exit();
    }
}

addMissingColumns();
