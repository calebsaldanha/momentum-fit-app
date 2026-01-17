const { Pool } = require('pg');
require('dotenv').config();

// Tenta pegar DATABASE_URL ou POSTGRES_URL (nomes comuns na Vercel)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('\n⚠️  ATENÇÃO: A variável de ambiente do Banco de Dados não foi encontrada.');
    console.error('   -> Se estiver rodando localmente, execute: vercel env pull .env');
    console.error('   -> O sistema tentará conectar, mas provavelmente falhará.\n');
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString ? {
        rejectUnauthorized: false // NECESSÁRIO para Vercel Postgres / Neon
    } : false,
    connectionTimeoutMillis: 5000 // Timeout de 5s para não travar funções serverless
});

// Tratamento silencioso de erros do pool para não derrubar a aplicação
pool.on('error', (err) => {
    console.error('Erro inesperado no cliente do banco (Pool):', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    
    // --- Helpers de Usuário e Cliente ---
    getUserById: async (id) => {
        const res = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        return res.rows[0];
    },
    getClientData: async (userId) => {
        const res = await pool.query("SELECT * FROM clients WHERE user_id = $1", [userId]);
        return res.rows[0];
    },
    ensureClientProfile: async (userId) => {
        // Busca perfil existente
        const res = await pool.query("SELECT * FROM clients WHERE user_id = $1", [userId]);
        if (res.rows.length > 0) return res.rows[0];
        // Cria novo se não existir
        const insert = await pool.query("INSERT INTO clients (user_id) VALUES ($1) RETURNING *", [userId]);
        return insert.rows[0];
    },
    
    // --- Helpers de Treino ---
    getClientWorkouts: async (clientId, limit = null) => {
        let q = `
            SELECT w.*, u.name as trainer_name 
            FROM workouts w
            LEFT JOIN users u ON w.trainer_id = u.id
            WHERE w.client_id = $1 AND w.status != 'archived'
            ORDER BY w.created_at DESC
        `;
        if (limit) q += ` LIMIT ${limit}`;
        return (await pool.query(q, [clientId])).rows;
    },
    getClientStats: async (userId) => {
        // Estatísticas básicas
        try {
            const res = await pool.query(`
                SELECT COUNT(*) FROM workouts w
                JOIN clients c ON w.client_id = c.id
                WHERE c.user_id = $1 AND w.status = 'completed'
            `, [userId]);
            return { completed_workouts: res.rows[0].count, streak: 0 };
        } catch(e) { return { completed_workouts: 0, streak: 0 }; }
    },
    
    // --- Helpers Gerais ---
    updateUser: async (id, data) => {
        if(data.name) await pool.query("UPDATE users SET name = $1 WHERE id = $2", [data.name, id]);
    },
    updateClientProfileFull: async (userId, data) => {
        await pool.query(`
            UPDATE clients SET 
                birth_date=$1, gender=$2, height=$3, current_weight=$4, 
                activity_level=$5, fitness_goals=$6, training_days=$7, available_equipment=$8, injuries=$9
            WHERE user_id=$10
        `, [
            data.birth_date || null, data.gender, data.height, data.current_weight, 
            data.activity_level, data.fitness_goals, data.training_days, 
            data.available_equipment, data.medical_conditions, userId
        ]);
    },
    updateUserPassword: async (id, hash) => {
        await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hash, id]);
    },
    getTrainerClients: async (trainerUserId) => {
        return (await pool.query(`
            SELECT c.*, u.name, u.email, u.profile_image 
            FROM clients c JOIN users u ON c.user_id = u.id 
            WHERE c.trainer_id = $1
        `, [trainerUserId])).rows;
    },
    getAllTrainers: async () => {
        try {
            return (await pool.query("SELECT t.*, u.name, u.profile_image FROM trainers t JOIN users u ON t.user_id = u.id")).rows;
        } catch (e) { return []; }
    }
};
