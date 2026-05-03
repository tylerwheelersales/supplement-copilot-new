-- Idempotent schema — safe to run on every server startup.
-- CREATE TABLE IF NOT EXISTS skips existing tables.
-- ALTER TABLE ADD COLUMN IF NOT EXISTS skips existing columns.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile JSONB DEFAULT NULL;

CREATE TABLE IF NOT EXISTS supplements (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  brand               TEXT,
  supplement_type     TEXT,
  servings_per_bottle INTEGER NOT NULL,
  servings_per_day    NUMERIC(5,2) NOT NULL DEFAULT 1,
  remaining_servings  NUMERIC(8,2) NOT NULL,
  low_stock_threshold INTEGER NOT NULL DEFAULT 7,
  amazon_link         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE supplements ADD COLUMN IF NOT EXISTS supplement_type    TEXT;
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS remaining_servings NUMERIC(8,2);
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE supplements SET remaining_servings = servings_per_bottle WHERE remaining_servings IS NULL;

CREATE TABLE IF NOT EXISTS intake_logs (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplement_id  INTEGER NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  servings_taken NUMERIC(5,2) NOT NULL DEFAULT 1,
  taken_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplements_user_id    ON supplements(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_logs_user_id    ON intake_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_logs_supplement ON intake_logs(supplement_id);
CREATE INDEX IF NOT EXISTS idx_intake_logs_taken_at   ON intake_logs(taken_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_remaining_servings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE supplements SET remaining_servings = remaining_servings - NEW.servings_taken WHERE id = NEW.supplement_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER supplements_updated_at BEFORE UPDATE ON supplements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER intake_log_decrement AFTER INSERT ON intake_logs FOR EACH ROW EXECUTE FUNCTION decrement_remaining_servings();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
