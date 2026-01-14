-- SCHEMA DEFINITIVO MOMENTUM FIT
-- Consolidado de todos os scripts de manutenção anteriores

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    role VARCHAR(50) DEFAULT 'client', -- client, trainer, admin, superadmin
    trainer_id INTEGER REFERENCES users(id),
    profile_image TEXT,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    height NUMERIC(5,2),
    current_weight NUMERIC(5,2),
    fitness_goals TEXT,
    fitness_level VARCHAR(50),
    injuries TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trainers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    specialties TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workouts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id), -- Referência correta para a tabela clients
    trainer_id INTEGER REFERENCES users(id),
    title VARCHAR(255),
    description TEXT,
    exercises JSONB, -- Backup legado, usar workout_exercises preferencialmente
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
    name VARCHAR(255),
    sets INTEGER,
    reps VARCHAR(50),
    weight VARCHAR(50),
    notes TEXT,
    image_url TEXT,
    video_url TEXT,
    order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checkins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    workout_id INTEGER REFERENCES workouts(id),
    date DATE DEFAULT CURRENT_DATE,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    target_muscle VARCHAR(100),
    description TEXT,
    execution_instructions TEXT,
    image_url TEXT,
    video_url TEXT,
    tips TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_workouts_client ON workouts(client_id);
