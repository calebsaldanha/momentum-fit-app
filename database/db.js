const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// --- Funções Originais ---

function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM users WHERE email = ?";
        db.get(sql, [email], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM users WHERE id = ?";
        db.get(sql, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function createUser(user) {
    return new Promise(async (resolve, reject) => {
        const { name, email, password, role, trainer_id, profile_image, goal, fitness_level, height, weight } = user;
        let hashedPassword = null;
        if (password) {
             hashedPassword = await bcrypt.hash(password, 10);
        }

        const sql = `INSERT INTO users (name, email, password, role, trainer_id, profile_image, goal, fitness_level, height, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [name, email, hashedPassword, role, trainer_id, profile_image, goal, fitness_level, height, weight], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, ...user });
        });
    });
}

function updateUser(id, updates) {
    return new Promise(async (resolve, reject) => {
        const fields = [];
        const values = [];

        for (const key in updates) {
            if (key === 'password') {
                const hashedPassword = await bcrypt.hash(updates[key], 10);
                fields.push(`${key} = ?`);
                values.push(hashedPassword);
            } else {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        }
        
        values.push(id);
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

        db.run(sql, values, function(err) {
            if (err) reject(err);
            else resolve({ id, ...updates });
        });
    });
}

function getWorkoutsByUserId(userId) {
     return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM workouts WHERE user_id = ? ORDER BY created_at DESC";
        db.all(sql, [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function createWorkout(workout) {
    return new Promise((resolve, reject) => {
        const { user_id, trainer_id, title, description, exercises } = workout; // exercises is JSON string
        const sql = "INSERT INTO workouts (user_id, trainer_id, title, description, exercises) VALUES (?, ?, ?, ?, ?)";
        db.run(sql, [user_id, trainer_id, title, description, exercises], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, ...workout });
        });
    });
}

function getAllTrainers() {
    return new Promise((resolve, reject) => {
        const sql = "SELECT id, name, email, profile_image FROM users WHERE role = 'trainer' OR role = 'superadmin'";
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getClients() {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM users WHERE role = 'client'";
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getUserStats(userId) {
    return new Promise((resolve, reject) => {
        // Mock ou implementação simples
        const stats = {
            completed_workouts: 0,
            streak: 0,
            last_workout: null
        };
        // Aqui poderia ter queries reais
        resolve(stats);
    });
}

// --- NOVAS FUNÇÕES (CORRIGIDAS) ---

async function getClientsByTrainer(trainerId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, name, email, profile_image, goal, status, created_at 
            FROM users 
            WHERE role = 'client' AND trainer_id = ? 
            ORDER BY name ASC
        `;
        db.all(sql, [trainerId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

async function getRecentClientsByTrainer(trainerId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, name, email, created_at 
            FROM users 
            WHERE role = 'client' AND trainer_id = ? 
            ORDER BY created_at DESC 
            LIMIT 5
        `;
        db.all(sql, [trainerId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

async function getTrainerStats(trainerId) {
    return new Promise((resolve, reject) => {
        const stats = { totalClients: 0, totalWorkouts: 0, weeklyCheckins: 0 };
        
        const sqlClients = "SELECT COUNT(*) as count FROM users WHERE role = 'client' AND trainer_id = ?";
        const sqlWorkouts = "SELECT COUNT(*) as count FROM workouts WHERE trainer_id = ?";
        const sqlCheckins = `
            SELECT COUNT(*) as count 
            FROM checkins 
            JOIN users ON checkins.user_id = users.id 
            WHERE users.trainer_id = ? AND checkins.created_at >= date('now', '-7 days')
        `;

        db.get(sqlClients, [trainerId], (err, row) => {
            if (err) return reject(err);
            stats.totalClients = row ? row.count : 0;

            db.get(sqlWorkouts, [trainerId], (err, row) => {
                if (err) return reject(err);
                stats.totalWorkouts = row ? row.count : 0;

                db.get(sqlCheckins, [trainerId], (err, row) => {
                    // Checkins pode dar erro se a tabela não existir ainda, tratamos com fallback
                    if (err && err.message.includes('no such table')) {
                         stats.weeklyCheckins = 0;
                         resolve(stats);
                    } else if (err) {
                        return reject(err);
                    } else {
                        stats.weeklyCheckins = row ? row.count : 0;
                        resolve(stats);
                    }
                });
            });
        });
    });
}

module.exports = {
    db,
    getUserByEmail,
    getUserById,
    createUser,
    updateUser,
    getWorkoutsByUserId,
    createWorkout,
    getAllTrainers,
    getClients,
    getUserStats,
    // Novas exportações
    getClientsByTrainer,
    getRecentClientsByTrainer,
    getTrainerStats
};
