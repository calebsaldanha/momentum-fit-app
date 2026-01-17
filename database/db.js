const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

// Configuração SSL adaptativa
// Se for produção ou URL da Neon/AWS, usa SSL.
// Localhost (Windows) geralmente não usa SSL.
const useSSL = isProduction || (connectionString && (connectionString.includes('neon.tech') || connectionString.includes('aws')));

const poolConfig = {
    connectionString: connectionString,
};

if (useSSL) {
    poolConfig.ssl = {
        rejectUnauthorized: false // Aceita certificados self-signed (comum em PaaS)
    };
} else {
    poolConfig.ssl = false;
}

const pool = new Pool(poolConfig);

// Tratamento de erro no pool para evitar crash da aplicação
pool.on('error', (err, client) => {
    console.error('Erro inesperado no cliente do banco de dados (Pool):', err);
    // Não encerra o processo, apenas loga
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    
    // Helpers comuns
    getClientData: async (userId) => {
        const res = await pool.query("SELECT * FROM clients WHERE user_id = $1", [userId]);
        return res.rows[0];
    },
    ensureClientProfile: async (userId) => {
        const check = await pool.query("SELECT * FROM clients WHERE user_id = $1", [userId]);
        if (check.rows.length > 0) return check.rows[0];
        const insert = await pool.query("INSERT INTO clients (user_id) VALUES ($1) RETURNING *", [userId]);
        return insert.rows[0];
    },
    getClientWorkouts: async (clientId, limit = null) => {
        let query = `
            SELECT w.*, u.name as trainer_name 
            FROM workouts w
            LEFT JOIN users u ON w.trainer_id = u.id
            WHERE w.client_id = $1 AND w.status != 'archived'
            ORDER BY w.created_at DESC
        `;
        if (limit) query += ` LIMIT ${limit}`;
        const res = await pool.query(query, [clientId]);
        return res.rows;
    },
    getClientStats: async (userId) => {
        try {
            const completed = await pool.query(`
                SELECT COUNT(*) FROM workouts 
                WHERE client_id = (SELECT id FROM clients WHERE user_id = $1) 
                AND status = 'completed'
            `, [userId]);
            return { completed_workouts: completed.rows[0]?.count || 0, streak: 0 };
        } catch(e) { return { completed_workouts: 0, streak: 0 }; }
    },
    getTrainerClients: async (trainerUserId) => {
        const res = await pool.query(`
            SELECT c.*, u.name, u.email, u.profile_image
            FROM clients c JOIN users u ON c.user_id = u.id
            WHERE c.trainer_id = $1
        `, [trainerUserId]);
        return res.rows;
    },
    getUserById: async (id) => (await pool.query("SELECT * FROM users WHERE id = $1", [id])).rows[0],
    updateUser: async (id, data) => { if(data.name) await pool.query("UPDATE users SET name = $1 WHERE id = $2", [data.name, id]); },
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
    updateUserPassword: async (id, hash) => await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hash, id]),
    getAllTrainers: async () => (await pool.query("SELECT t.*, u.name FROM trainers t JOIN users u ON t.user_id = u.id")).rows
};
