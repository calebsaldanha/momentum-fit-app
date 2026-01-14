-- MOMENTUM FIT - SCHEMA COMPLETO (FINAL)
-- Cobre: Auth, Clientes, Treiners, Admin, Treinos, IA, Financeiro, Blog, Planos.

-- 1. USUÁRIOS E PERFIS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('client', 'trainer', 'admin', 'superadmin')),
    profile_image TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    birth_date DATE,
    gender VARCHAR(50),
    height NUMERIC(5,2), -- em metros
    current_weight NUMERIC(5,2),
    fitness_goals TEXT,
    activity_level VARCHAR(50),
    injuries TEXT, -- Restrições médicas
    available_equipment TEXT,
    training_days VARCHAR(255), -- Ex: "Seg,Qua,Sex"
    preferences JSONB, -- Configurações extras
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trainers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    bio TEXT,
    specialties TEXT, -- Ex: "Hipertrofia, Yoga"
    certifications TEXT,
    approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    rating NUMERIC(3,2) DEFAULT 5.0,
    commission_rate NUMERIC(5,2) DEFAULT 0.80, -- 80% para o personal
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. CONTEÚDO E BLOG
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    author_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    content TEXT NOT NULL,
    category VARCHAR(100),
    cover_image TEXT,
    status VARCHAR(50) DEFAULT 'published', -- draft, published
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. PLANOS E FINANCEIRO
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    duration_months INTEGER DEFAULT 1,
    features JSONB, -- Lista de benefícios
    target_role VARCHAR(50), -- 'client' ou 'trainer'
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan_id INTEGER REFERENCES plans(id),
    status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    auto_renew BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL,
    type VARCHAR(50), -- 'subscription', 'payout' (saque trainer)
    status VARCHAR(50), -- completed, pending
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. TREINOS E EXERCÍCIOS
CREATE TABLE IF NOT EXISTS exercise_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    muscle_group VARCHAR(100),
    equipment VARCHAR(100),
    video_url TEXT,
    image_url TEXT,
    instructions TEXT,
    is_platform_default BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) -- NULL se for da plataforma
);

CREATE TABLE IF NOT EXISTS workouts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    trainer_id INTEGER REFERENCES users(id),
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercise_library(id),
    custom_name VARCHAR(255), -- Caso queira sobrescrever o nome
    sets INTEGER,
    reps VARCHAR(50),
    weight VARCHAR(50),
    notes TEXT,
    order_index INTEGER
);

-- 5. ACOMPANHAMENTO E IA
CREATE TABLE IF NOT EXISTS checkins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    workout_id INTEGER REFERENCES workouts(id),
    date DATE DEFAULT CURRENT_DATE,
    feedback_text TEXT,
    effort_level INTEGER, -- 1 a 10
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_history (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    weight NUMERIC(5,2),
    photo_front TEXT,
    photo_side TEXT,
    photo_back TEXT,
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    prompt TEXT,
    response TEXT,
    feature_used VARCHAR(100), -- 'coach_chat', 'workout_gen'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    type VARCHAR(50), -- 'info', 'alert', 'success'
    created_at TIMESTAMP DEFAULT NOW()
);

-- RELACIONAMENTO TRAINER-CLIENT
ALTER TABLE users ADD COLUMN IF NOT EXISTS trainer_id INTEGER REFERENCES users(id);
