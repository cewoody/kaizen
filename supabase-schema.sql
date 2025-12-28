-- Run this in your Supabase SQL Editor

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  strava_athlete_id BIGINT UNIQUE,
  strava_access_token TEXT,
  strava_refresh_token TEXT,
  strava_token_expires_at BIGINT,
  handicap DECIMAL(3,2) DEFAULT 1.0,  -- multiplier (e.g., 0.85 = 85% of points)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  strava_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  workout_type TEXT DEFAULT 'training',  -- 'training', 'race', 'golf_tournament'
  description TEXT,
  moving_time_seconds INTEGER NOT NULL,
  elapsed_time_seconds INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  start_date_local TIMESTAMP NOT NULL,
  timezone TEXT,
  suffer_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_start_date ON activities(start_date);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Penalties table (poptarts, chips, wine)
CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  penalty_type TEXT NOT NULL,  -- 'poptart' or 'wine'
  quantity INTEGER NOT NULL DEFAULT 1,
  penalty_date DATE NOT NULL,
  logged_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_penalties_user_id ON penalties(user_id);
CREATE INDEX idx_penalties_date ON penalties(penalty_date);

-- Enable Row Level Security
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (we'll tighten this later with auth)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on activities" ON activities FOR ALL USING (true);
CREATE POLICY "Allow all operations on penalties" ON penalties FOR ALL USING (true);
