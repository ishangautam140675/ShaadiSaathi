-- ShaadiSaathi SQLite Schema (Phase 2: Authentication, Multi-Tenancy & Family RBAC)
-- Phase 3: Real Wedding Budget & Expense Management

PRAGMA foreign_keys = ON;

-- 1. Families (Tenant Partitioning & Wedding Budget)
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bride_name TEXT NOT NULL,
  groom_name TEXT NOT NULL,
  wedding_date TEXT NOT NULL,
  total_budget REAL NOT NULL DEFAULT 2500000,
  total_budget_paise INTEGER NOT NULL DEFAULT 250000000,
  currency TEXT NOT NULL DEFAULT 'INR',
  budget_updated_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Users (Scoped to a Family)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('OWNER', 'FAMILY_MEMBER', 'VIEWER')),
  side TEXT NOT NULL DEFAULT 'mutual' CHECK(side IN ('bride', 'groom', 'mutual')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_family ON users(family_id);

-- 3. Sessions (Independent Multi-Device Session Isolation)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_family ON sessions(family_id);

-- 4. Family Invitations (Secure Cryptographic One-Time Tokens)
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  invited_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('FAMILY_MEMBER', 'VIEWER')),
  side TEXT NOT NULL DEFAULT 'mutual' CHECK(side IN ('bride', 'groom', 'mutual')),
  token_hash TEXT NOT NULL UNIQUE,
  token_preview TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  accepted_at TEXT,
  accepted_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_family ON invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- 5. Rate Limiting Table (Brute-Force & Abuse Mitigation)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  first_attempt_at INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
);

-- 6. Expenses (Phase 3: Real Wedding Budget & Expense Management)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  paid_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount_paise >= 0 AND paid_amount_paise <= amount_paise),
  category TEXT NOT NULL CHECK (category IN (
    'venue', 'catering', 'decoration', 'clothing', 'jewellery',
    'photography', 'invitations', 'makeup', 'transport', 'gifts', 'other'
  )),
  date TEXT NOT NULL,
  paid_by_name TEXT NOT NULL,
  paid_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  vendor_name TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'partially_paid', 'pending')),
  notes TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  updated_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_family ON expenses(family_id);
CREATE INDEX IF NOT EXISTS idx_expenses_family_date ON expenses(family_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_family_category ON expenses(family_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_family_status ON expenses(family_id, payment_status);

-- 7. Expense Audit Logs (Phase 3: Historical Audit Trail)
CREATE TABLE IF NOT EXISTS expense_audit_logs (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  expense_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  changed_by_user_id TEXT NOT NULL REFERENCES users(id),
  previous_values TEXT,
  new_values TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expense_audit_family ON expense_audit_logs(family_id);
CREATE INDEX IF NOT EXISTS idx_expense_audit_expense ON expense_audit_logs(expense_id);
