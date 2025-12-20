const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("❌ ERRO CRÍTICO: A variável POSTGRES_URL não está definida.");
}

// Configuração otimizada para Serverless (SSL obrigatório em produção)
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 4, // Limita conexões em ambiente serverless para evitar erros
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const initDb = async () => {
  let client;
  try {
    client = await pool.connect();
    
    // Tabela USERS
    await client.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'client' CHECK (role IN ('client', 'trainer', 'superadmin')),
        status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('pending', 'pending_approval', 'active', 'rejected')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);

    // Tabela CLIENT_PROFILES
    await client.query(\`
      CREATE TABLE IF NOT EXISTS client_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        age INTEGER,
        weight REAL,
        height REAL,
        fitness_level TEXT,
        goals TEXT,
        medical_conditions TEXT,
        assigned_trainer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        training_days INTEGER,
        training_duration TEXT,
        equipment TEXT,
        activity_level TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);

    // Tabela TRAINER_PROFILES
    await client.query(\`
      CREATE TABLE IF NOT EXISTS trainer_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        certifications TEXT,
        experience TEXT,
        bio TEXT,
        profile_submitted BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);

    // Tabela WORKOUTS
    await client.query(\`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        trainer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        exercises JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);

    // Tabela WORKOUT_CHECKINS
    await client.query(\`
      CREATE TABLE IF NOT EXISTS workout_checkins (
        id SERIAL PRIMARY KEY,
        workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT false,
        notes TEXT,
        rating INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    
    // Tabela MESSAGES
    await client.query(\`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL, 
        message_type TEXT DEFAULT 'text' NOT NULL CHECK (message_type IN ('text', 'image', 'video')),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);

    // Tabela ARTICLES
    await client.query(\`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        category TEXT,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);

    // Tabela NOTIFICATIONS
    await client.query(\`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);

    // Tabela SESSION
    await client.query(\`
      CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);
      
      DO \$\$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey') THEN
            ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
      END;
      \$\$;
    \`);
    
    console.log('✅ DB Init: Tabelas verificadas.');
  } catch (err) {
    console.error('❌ DB Init Error:', err);
  } finally {
    if (client) client.release();
  }
};

module.exports = { pool, initDb };
