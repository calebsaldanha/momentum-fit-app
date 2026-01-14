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

const query = (text, params) => pool.query(text, params);

// --- USUÁRIOS & AUTH ---

async function getUserByEmail(email) {
    const res = await query("SELECT * FROM users WHERE email = $1", [email]);
    return res.rows[0];
}

async function getUserById(id) {
    const res = await query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0];
}

async function createUser(user) {
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
    const allowedFields = ['name', 'email', 'password', 'role', 'trainer_id', 'profile_image', 'last_login'];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key in updates) {
        if (!allowedFields.includes(key)) continue;
        
        let value = updates[key];
        if (key === 'password') {
            value = await bcrypt.hash(value, 10);
        }
        
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
    }
    
    if (fields.length === 0) return getUserById(id);

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query(sql, values);
    return res.rows[0];
}

// --- CLIENTES (Lógica movida das Rotas) ---

async function getClientData(userId) {
    const sql = `
        SELECT u.name, u.email, u.profile_image, c.* FROM users u 
        LEFT JOIN clients c ON u.id = c.user_id 
        WHERE u.id = $1`;
    const res = await query(sql, [userId]);
    return res.rows[0];
}

async function ensureClientProfile(userId) {
    // Garante que existe registro na tabela clients
    await query("INSERT INTO clients (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId]);
    return getClientData(userId);
}

async function getClientWorkouts(clientId, limit = null) {
    let sql = `
        SELECT w.*, u.name as trainer_name 
        FROM workouts w 
        LEFT JOIN users u ON w.trainer_id = u.id 
        WHERE w.client_id = $1 
        ORDER BY w.created_at DESC`;
    
    if (limit) sql += ` LIMIT ${limit}`;
    
    const res = await query(sql, [clientId]);
    return res.rows;
}

async function getClientStats(userId) {
    const checkinsRes = await query("SELECT COUNT(*) FROM checkins WHERE user_id = $1", [userId]);
    const streakRes = await query(`
        SELECT COUNT(DISTINCT DATE(created_at)) 
        FROM checkins 
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
    `, [userId]);
    
    return {
        completed: parseInt(checkinsRes.rows[0].count || 0),
        streak: parseInt(streakRes.rows[0].count || 0)
    };
}

async function getWorkoutDetails(workoutId, clientId) {
    const workoutRes = await query("SELECT * FROM workouts WHERE id = $1 AND client_id = $2", [workoutId, clientId]);
    if (workoutRes.rows.length === 0) return null;
    
    const exercisesRes = await query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC", [workoutId]);
    
    return { ...workoutRes.rows[0], exercises: exercisesRes.rows };
}

// --- TREINADORES & ADMIN ---

async function getAllTrainers() {
    const res = await query("SELECT id, name, email, profile_image FROM users WHERE role = 'trainer' OR role = 'superadmin'", []);
    return res.rows;
}

async function getClientsByTrainer(trainerId) {
    const sql = `
        SELECT u.id, u.name, u.email, u.profile_image, u.created_at,
               c.fitness_goals as goal, c.id as client_real_id
        FROM users u 
        LEFT JOIN clients c ON u.id = c.user_id
        WHERE u.role = 'client' AND u.trainer_id = $1 
        ORDER BY u.name ASC`;
    const res = await query(sql, [trainerId]);
    return res.rows;
}

module.exports = {
    query, pool,
    getUserByEmail, getUserById, createUser, updateUser,
    getClientData, ensureClientProfile, getClientWorkouts, getClientStats, getWorkoutDetails,
    getAllTrainers, getClientsByTrainer
};

// Adicionado via Script de Atualização
async function updateUserPassword(userId, hashedPassword) {
    const res = await query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, userId]);
    return res.rowCount > 0;
}

async function updateClientProfileFull(userId, data) {
    // Atualiza tabela clients com campos estendidos
    const { 
        height, current_weight, fitness_goals, 
        gender, birth_date, activity_level, training_days, 
        available_equipment, medical_conditions 
    } = data;

    // Converte altura cm -> m se necessario
    let h_meters = height;
    if (height > 3) h_meters = height / 100.0;

    const sql = `
        INSERT INTO clients (user_id, height, current_weight, fitness_goals, gender, birth_date, activity_level, training_days, available_equipment, medical_conditions, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            height = EXCLUDED.height,
            current_weight = EXCLUDED.current_weight,
            fitness_goals = EXCLUDED.fitness_goals,
            gender = EXCLUDED.gender,
            birth_date = EXCLUDED.birth_date,
            activity_level = EXCLUDED.activity_level,
            training_days = EXCLUDED.training_days,
            available_equipment = EXCLUDED.available_equipment,
            medical_conditions = EXCLUDED.medical_conditions,
            updated_at = NOW()
        RETURNING *;
    `;
    const res = await query(sql, [userId, h_meters, current_weight, fitness_goals, gender, birth_date, activity_level, training_days, available_equipment, medical_conditions]);
    return res.rows[0];
}

// Exportando as novas funções (re-exportando tudo para garantir)
module.exports = {
    query, pool,
    getUserByEmail, getUserById, createUser, updateUser,
    getClientData, ensureClientProfile, getClientWorkouts, getClientStats, getWorkoutDetails,
    getAllTrainers, getClientsByTrainer,
    updateUserPassword, updateClientProfileFull 
};
