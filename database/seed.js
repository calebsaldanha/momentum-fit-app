const db = require('./db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        console.log('��� Iniciando Seed do Banco de Dados...');

        // 1. Ler e executar Schema Completo
        const schemaPath = path.join(__dirname, 'schema_full.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await db.query(schema);
        console.log('✅ Tabelas recriadas com sucesso.');

        // 2. Hash da senha padrão '123456'
        const hashedPassword = await bcrypt.hash('123456', 10);

        // 3. Inserir Usuários (Admin, Trainer, Client)
        // Admin
        const adminRes = await db.query(`
            INSERT INTO users (name, email, password, role) 
            VALUES ('Administrador', 'admin@momentum.com', $1, 'superadmin') 
            RETURNING id
        `, [hashedPassword]);

        // Trainer
        const trainerRes = await db.query(`
            INSERT INTO users (name, email, password, role) 
            VALUES ('Ricardo Treinador', 'trainer@momentum.com', $1, 'trainer') 
            RETURNING id
        `, [hashedPassword]);

        // Client
        const clientRes = await db.query(`
            INSERT INTO users (name, email, password, role) 
            VALUES ('Lucas Aluno', 'aluno@momentum.com', $1, 'client') 
            RETURNING id
        `, [hashedPassword]);

        console.log('✅ Usuários inseridos com senhas criptografadas.');

        // 4. Criar Perfis (Obrigatório para login não falhar na deserialização)
        await db.query(`INSERT INTO profiles (user_id, weight, height) VALUES ($1, 80, 1.80)`, [adminRes.rows[0].id]);
        await db.query(`INSERT INTO trainers (user_id, bio, specialties) VALUES ($1, 'Especialista em Hipertrofia', 'Musculação')`, [trainerRes.rows[0].id]);
        await db.query(`INSERT INTO profiles (user_id, weight, height) VALUES ($1, 75, 1.75)`, [clientRes.rows[0].id]); // Aluno tem profile

        console.log('✅ Perfis vinculados.');
        console.log('��� Seed concluído! Login: admin@momentum.com / 123456');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro no Seed:', error);
        process.exit(1);
    }
}

seedDatabase();
