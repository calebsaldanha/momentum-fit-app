const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configuração da Conexão
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("❌ ERRO CRÍTICO: Nenhuma string de conexão encontrada. Verifique suas variáveis de ambiente.");
}

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Wrapper para facilitar queries
const query = (text, params) => pool.query(text, params);

// --- FUNÇÕES DE USUÁRIO ---

async function getUserByEmail(email) {
    const res = await query("SELECT * FROM users WHERE email = $1", [email]);
    return res.rows[0];
}

async function getUserById(id) {
    const res = await query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0];
}

async function createUser(user) {
    const { name, email, password, role, trainer_id, profile_image, goal, fitness_level, height, weight } = user;
    let hashedPassword = null;
    if (password) {
         hashedPassword = await bcrypt.hash(password, 10);
    }

    const sql = `
        INSERT INTO users (name, email, password, role, trainer_id, profile_image, goal, fitness_level, height, weight) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`;
    
    const res = await query(sql, [name, email, hashedPassword, role, trainer_id, profile_image, goal, fitness_level, height, weight]);
    return res.rows[0];
}

async function updateUser(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key in updates) {
        if (key === 'password') {
            const hashedPassword = await bcrypt.hash(updates[key], 10);
            fields.push(`${key} = $${idx}`);
            values.push(hashedPassword);
        } else {
            fields.push(`${key} = $${idx}`);
            values.push(updates[key]);
        }
        idx++;
    }
    
    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

    const res = await query(sql, values);
    return res.rows[0];
}

// --- FUNÇÕES DE TREINO E GESTÃO ---

async function getWorkoutsByUserId(userId) {
    const res = await query("SELECT * FROM workouts WHERE client_id = $1 OR user_id = $1 ORDER BY created_at DESC", [userId]);
    return res.rows;
}

async function createWorkout(workout) {
    const client_id = workout.client_id || workout.user_id; const { trainer_id, title, description, exercises } = workout;
    const exercisesJson = typeof exercises === 'string' ? exercises : JSON.stringify(exercises);
    
    const sql = "INSERT INTO workouts (client_id, trainer_id, title, description, exercises) VALUES ($1, $2, $3, $4, $5) RETURNING *";
    const res = await query(sql, [client_id, trainer_id, title, description, exercisesJson]);
    return res.rows[0];
}

async function getAllTrainers() {
    const res = await query("SELECT id, name, email, profile_image FROM users WHERE role = 'trainer' OR role = 'superadmin'", []);
    return res.rows;
}

async function getClients() {
    const res = await query("SELECT * FROM users WHERE role = 'client'", []);
    return res.rows;
}

async function getUserStats(userId) {
    // Implementação básica para evitar erro
    return {
        completed_workouts: 0,
        streak: 0,
        last_workout: null
    };
}

// --- FUNÇÕES EXCLUSIVAS DO PAINEL DO TREINADOR (FILTRADAS POR ID) ---

async function getClientsByTrainer(trainerId) {
    const sql = `
        SELECT id, name, email, profile_image, goal, status, created_at 
        FROM users 
        WHERE role = 'client' AND trainer_id = $1 
        ORDER BY name ASC
    `;
    const res = await query(sql, [trainerId]);
    return res.rows;
}

async function getRecentClientsByTrainer(trainerId) {
    const sql = `
        SELECT id, name, email, created_at 
        FROM users 
        WHERE role = 'client' AND trainer_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
    `;
    const res = await query(sql, [trainerId]);
    return res.rows;
}

async function getTrainerStats(trainerId) {
    const stats = { totalClients: 0, totalWorkouts: 0, weeklyCheckins: 0 };
    
    try {
        // 1. Total de Alunos
        const clientsRes = await query("SELECT COUNT(*) FROM users WHERE role = 'client' AND trainer_id = $1", [trainerId]);
        stats.totalClients = parseInt(clientsRes.rows[0].count || 0);

        // 2. Total de Treinos
        const workoutsRes = await query("SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", [trainerId]);
        stats.totalWorkouts = parseInt(workoutsRes.rows[0].count || 0);

        // 3. Checkins (com tratamento de erro caso a tabela não exista)
        try {
            const checkinsRes = await query(`
                SELECT COUNT(*) 
                FROM checkins 
                JOIN users ON checkins.user_id = users.id 
                WHERE users.trainer_id = $1 AND checkins.created_at >= NOW() - INTERVAL '7 days'
            `, [trainerId]);
            stats.weeklyCheckins = parseInt(checkinsRes.rows[0].count || 0);
        } catch (e) {
            stats.weeklyCheckins = 0;
        }
    } catch (err) {
        console.error("Erro ao calcular estatísticas do treinador:", err);
    }
    
    return stats;
}

module.exports = {
    query,
    pool,
    getUserByEmail,
    getUserById,
    createUser,
    updateUser,
    getWorkoutsByUserId,
    createWorkout,
    getAllTrainers,
    getClients,
    getUserStats,
    getClientsByTrainer,
    getRecentClientsByTrainer,
    getTrainerStats
};
