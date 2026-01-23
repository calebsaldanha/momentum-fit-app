require('dotenv').config();
const db = require('../database/db');
const bcrypt = require('bcryptjs'); // USANDO BCRYPTJS

async function createAdmin() {
    const email = 'admin@momentum.com';
    const password = 'admin'; 
    const name = 'Administrador';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const check = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (check.rows.length > 0) {
            console.log('Admin já existe. Atualizando senha...');
            await db.query("UPDATE users SET password = $1, role = 'superadmin' WHERE email = $2", [hashedPassword, email]);
        } else {
            console.log('Criando novo admin...');
            await db.query("INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'superadmin')", [name, email, hashedPassword]);
        }
        console.log('✅ Admin configurado com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('Erro:', err);
        process.exit(1);
    }
}

createAdmin();
