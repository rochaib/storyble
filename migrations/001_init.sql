-- migrations/001_init.sql
--
-- HOW TO RUN THIS MIGRATION:
-- 1. Go to neon.tech and create a free project
-- 2. Copy the connection string from the Neon dashboard
-- 3. Set DATABASE_URL in .env.local to that connection string
-- 4. Run: psql "$DATABASE_URL" -f migrations/001_init.sql
--    (or paste the SQL directly into the Neon SQL Editor in the dashboard)

CREATE TYPE game_status AS ENUM (
  'lobby', 'active', 'complete', 'expired', 'archived', 'locked'
);

CREATE TABLE games (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash     char(64) NOT NULL,
  code_salt     uuid NOT NULL,
  status        game_status NOT NULL DEFAULT 'lobby',
  opening_line  text NOT NULL,
  total_rounds  integer NOT NULL CHECK (total_rounds BETWEEN 1 AND 1000),
  timeout_hours integer NULL,
  current_round integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     uuid NOT NULL REFERENCES games ON DELETE CASCADE,
  nickname    text NOT NULL,
  join_order  integer NOT NULL,
  is_active   boolean NOT NULL DEFAULT true
);

CREATE TABLE turns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       uuid NOT NULL REFERENCES games ON DELETE CASCADE,
  player_id     uuid NOT NULL REFERENCES players ON DELETE CASCADE,
  round_number  integer NOT NULL,
  sentence      text NOT NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE nps_responses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score      smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid NOT NULL REFERENCES players ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
