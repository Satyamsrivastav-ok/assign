CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  phone      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active OTP per phone. Only a bcrypt hash of the code is stored.
CREATE TABLE IF NOT EXISTS otps (
  phone        TEXT PRIMARY KEY,
  code_hash    TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INT NOT NULL DEFAULT 0,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loans (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_name TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','repaid')),
  repaid_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
