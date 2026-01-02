const { Pool } = require('pg');
require('dotenv').config();

// Tenta pegar a URL de conexão de ambas as variáveis comuns na Vercel
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// LOG DE DEBUG (Não mostra a senha, apenas se a variável existe)
if (!connectionString) {
  console.error("❌ ERRO CRÍTICO: Nenhuma string de conexão encontrada (DATABASE_URL ou POSTGRES_URL vazias).");
  console.error("O sistema tentará conectar em localhost (127.0.0.1), o que falhará na Vercel.");
} else {
  console.log("✅ Variável de conexão com banco de dados detectada.");
}

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✅ Pool de conexão: Cliente conectado com sucesso!');
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no cliente inativo do pool:', err);
  // Não damos exit(-1) aqui para evitar crash loop imediato se for erro transiente
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};

/* --- FUNÇÕES ESPECÍFICAS PARA O PAINEL DO TREINADOR (FILTRADAS POR ID) --- */

// Busca apenas alunos vinculados ao treinador logado
async function getClientsByTrainer(trainerId) {
    return new Promise((resolve, reject) => {
        // Pega alunos onde trainer_id bate OU (caso seja superadmin testando) cria lógica específica
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

// Busca os alunos mais recentes (apenas do treinador) para o Dashboard
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

// Estatísticas exclusivas do Treinador (não globais)
async function getTrainerStats(trainerId) {
    return new Promise((resolve, reject) => {
        const stats = { totalClients: 0, totalWorkouts: 0, weeklyCheckins: 0 };
        
        // 1. Total de Alunos do Treinador
        const sqlClients = "SELECT COUNT(*) as count FROM users WHERE role = 'client' AND trainer_id = ?";
        
        // 2. Total de Treinos criados por este Treinador
        const sqlWorkouts = "SELECT COUNT(*) as count FROM workouts WHERE trainer_id = ?";
        
        // 3. Checkins dos alunos DESTE treinador (Join simples)
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
                    if (err) return reject(err);
                    stats.weeklyCheckins = row ? row.count : 0;
                    resolve(stats);
                });
            });
        });
    });
}

// Exportar as novas funções
module.exports.getClientsByTrainer = getClientsByTrainer;
module.exports.getRecentClientsByTrainer = getRecentClientsByTrainer;
module.exports.getTrainerStats = getTrainerStats;
