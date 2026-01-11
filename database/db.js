const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configuração da Conexão
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("❌ ERRO CRÍTICO: Nenhuma string de conexão encontrada.");
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
    // CORREÇÃO: Removemos height, weight, goal, etc da tabela users.
    // Esses dados devem ser inseridos na tabela 'clients' pelo controller.
    const { name, email, password, role, trainer_id, profile_image } = user;
    
    let hashedPassword = null;
    if (password) {
         hashedPassword = await bcrypt.hash(password, 10);
    }

    const sql = `
        INSERT INTO users (name, email, password, role, trainer_id, profile_image) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *`;
    
    const res = await query(sql, [name, email, hashedPassword, role, trainer_id, profile_image]);
    return res.rows[0];
}

async function updateUser(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    // Filtra apenas campos que existem na tabela users
    const allowedFields = ['name', 'email', 'password', 'role', 'trainer_id', 'profile_image'];

    for (const key in updates) {
        if (!allowedFields.includes(key)) continue;

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
    
    if (fields.length === 0) return getUserById(id);

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
    const client_id = workout.client_id || workout.user_id; 
    const { trainer_id, title, description, exercises } = workout;
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
    // Retorna todos os usuários que são clientes
    const res = await query("SELECT * FROM users WHERE role = 'client'", []);
    return res.rows;
}

async function getUserStats(userId) {
    return {
        completed_workouts: 0,
        current_streak: 0, 
        total_checkins: 0,
        last_workout: null
    };
}

// --- FUNÇÕES DE TREINADOR ---

async function getClientsByTrainer(trainerId) {
    // CORRIGIDO: Busca dados físicos na tabela clients, não users
    const sql = `
        SELECT u.id, u.name, u.email, u.profile_image, u.created_at,
               c.fitness_goals as goal, c.id as client_real_id
        FROM users u 
        LEFT JOIN clients c ON u.id = c.user_id
        WHERE u.role = 'client' AND u.trainer_id = $1 
        ORDER BY u.name ASC
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
        const clientsRes = await query("SELECT COUNT(*) FROM users WHERE role = 'client' AND trainer_id = $1", [trainerId]);
        stats.totalClients = parseInt(clientsRes.rows[0].count || 0);

        const workoutsRes = await query("SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", [trainerId]);
        stats.totalWorkouts = parseInt(workoutsRes.rows[0].count || 0);

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
        console.error("Erro estatisticas:", err);
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
