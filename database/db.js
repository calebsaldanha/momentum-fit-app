const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.warn("A variável de ambiente POSTGRES_URL não está definida. O aplicativo pode não conseguir se conectar ao banco de dados.");
}

const pool = new Pool({
  connectionString,
});

const initDb = async () => {
  let client;
  try {
    client = await pool.connect();

    // Tabela USERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'client' CHECK (role IN ('client', 'trainer', 'superadmin')),
        status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('pending', 'pending_approval', 'active', 'rejected')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela CLIENT_PROFILES
    await client.query(`
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
        
        -- Novos Campos para o Questionário Detalhado
        training_days INTEGER,
        training_duration TEXT,
        equipment TEXT,
        activity_level TEXT,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Manutenção de colunas (Migrações)
    await client.query(`
      DO $$ BEGIN
        -- Remoção de colunas antigas (limpeza)
        IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='pronouns')
        THEN ALTER TABLE "users" DROP COLUMN "pronouns";
        END IF;
        IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='client_profiles' AND column_name='gender_identity')
        THEN ALTER TABLE "client_profiles" DROP COLUMN "gender_identity";
        END IF;
        IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='client_profiles' AND column_name='transition_related')
        THEN ALTER TABLE "client_profiles" DROP COLUMN "transition_related";
        END IF;

        -- Adição de novas colunas se não existirem
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='client_profiles' AND column_name='assigned_trainer_id')
        THEN ALTER TABLE "client_profiles" ADD COLUMN "assigned_trainer_id" INTEGER REFERENCES users(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='client_profiles' AND column_name='training_days')
        THEN ALTER TABLE "client_profiles" ADD COLUMN "training_days" INTEGER;
        END IF;

        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='client_profiles' AND column_name='training_duration')
        THEN ALTER TABLE "client_profiles" ADD COLUMN "training_duration" TEXT;
        END IF;

        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='client_profiles' AND column_name='equipment')
        THEN ALTER TABLE "client_profiles" ADD COLUMN "equipment" TEXT;
        END IF;

        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='client_profiles' AND column_name='activity_level')
        THEN ALTER TABLE "client_profiles" ADD COLUMN "activity_level" TEXT;
        END IF;
      END$$;
    `);

    // Tabela TRAINER_PROFILES
    await client.query(`
      CREATE TABLE IF NOT EXISTS trainer_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        certifications TEXT,
        experience TEXT,
        bio TEXT,
        profile_submitted BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela WORKOUTS
    await client.query(`
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
    `);

    // Tabela WORKOUT_CHECKINS
    await client.query(`
      CREATE TABLE IF NOT EXISTS workout_checkins (
        id SERIAL PRIMARY KEY,
        workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT false,
        notes TEXT,
        rating INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Tabela MESSAGES
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL, 
        message_type TEXT DEFAULT 'text' NOT NULL CHECK (message_type IN ('text', 'image', 'video')),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela ARTICLES
    await client.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        category TEXT,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela NOTIFICATIONS
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela SESSION
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);
      DO $$
      BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'session_pkey'
        )
        THEN
            ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
      END;
      $$;
    `);

    console.log('Banco de dados PostgreSQL inicializado e tabelas garantidas!');
  } catch (err) {
    console.error('Erro ao inicializar o banco de dados:', err.stack);
    throw err;
  } finally {
    if (client) client.release();
  }
};

module.exports = { pool, initDb };
