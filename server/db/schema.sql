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
  version INTEGER NOT NULL DEFAULT 1,
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
  vendor_id TEXT,
  source_document_id TEXT REFERENCES scan_documents(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'partially_paid', 'pending')),
  notes TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  updated_by_user_id TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
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

-- 8. Vendors (Phase 4: Vendor Management & Payment Tracking)
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'venue', 'catering', 'decoration', 'clothing', 'jewellery',
    'photography', 'invitations', 'makeup', 'transport', 'gifts', 'other',
    'attire', 'jewelry', 'decor', 'music_entertainment', 'logistics_travel', 'invitations_gifts', 'miscellaneous'
  )),
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT,
  city TEXT NOT NULL DEFAULT 'Local',
  address TEXT,
  agreed_amount_paise INTEGER NOT NULL CHECK (agreed_amount_paise >= 0),
  paid_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount_paise >= 0),
  balance_due_paise INTEGER NOT NULL DEFAULT 0 CHECK (balance_due_paise >= 0),
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'advance_paid', 'fully_paid', 'in_negotiation', 'cancelled')),
  event_name TEXT,
  notes TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  updated_by_user_id TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vendors_family ON vendors(family_id);
CREATE INDEX IF NOT EXISTS idx_vendors_family_category ON vendors(family_id, category);
CREATE INDEX IF NOT EXISTS idx_vendors_family_status ON vendors(family_id, status);

-- 9. Vendor Payments (Phase 4: Vendor Payment Tracking & Double-Counting Prevention)
CREATE TABLE IF NOT EXISTS vendor_payments (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  transaction_reference TEXT,
  notes TEXT,
  linked_expense_id TEXT REFERENCES expenses(id) ON DELETE SET NULL,
  recorded_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_family ON vendor_payments(family_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON vendor_payments(vendor_id);

-- 10. Shopping Items (Phase 4: Wedding Shopping Register)
CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'bride_clothing', 'groom_clothing', 'jewellery', 'family_clothing',
    'gifts', 'decorations', 'household', 'ceremony_supplies', 'other',
    'bride', 'groom', 'family', 'pooja_ceremony', 'return_gifts'
  )),
  description TEXT,
  estimated_price_paise INTEGER NOT NULL DEFAULT 0 CHECK (estimated_price_paise >= 0),
  actual_price_paise INTEGER NOT NULL DEFAULT 0 CHECK (actual_price_paise >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'to_buy', 'in_tailoring', 'purchased', 'cancelled')),
  assigned_to TEXT NOT NULL DEFAULT 'Family Member',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  deadline TEXT,
  store_name TEXT,
  notes TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  updated_by_user_id TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shopping_family ON shopping_items(family_id);
CREATE INDEX IF NOT EXISTS idx_shopping_family_status ON shopping_items(family_id, status);
CREATE INDEX IF NOT EXISTS idx_shopping_family_category ON shopping_items(family_id, category);

-- 11. Gifts & Shagun Register (Phase 4: Sacred Ledger, Decoupled from Operating Expenses)
CREATE TABLE IF NOT EXISTS gifts_shagun (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  giver_name TEXT NOT NULL,
  relation TEXT DEFAULT '',
  gift_type TEXT NOT NULL CHECK (gift_type IN ('cash', 'shagun', 'physical_gift', 'jewellery', 'other')),
  amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (amount_paise >= 0),
  description TEXT,
  date_received TEXT NOT NULL,
  recipient TEXT DEFAULT 'couple',
  side TEXT NOT NULL DEFAULT 'mutual' CHECK (side IN ('bride', 'groom', 'mutual')),
  notes TEXT,
  recorded_by_user_id TEXT NOT NULL REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gifts_family ON gifts_shagun(family_id);
CREATE INDEX IF NOT EXISTS idx_gifts_family_side ON gifts_shagun(family_id, side);
CREATE INDEX IF NOT EXISTS idx_gifts_family_type ON gifts_shagun(family_id, gift_type);

-- 12. Checklist Tasks (Phase 4: Wedding Preparation Tasks & Duties)
CREATE TABLE IF NOT EXISTS checklist_tasks (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  phase TEXT NOT NULL CHECK (phase IN ('6_months', '3_months', '1_month', 'wedding_week', 'day_of', 'post_wedding')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  assigned_to TEXT NOT NULL DEFAULT 'Family Member',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TEXT,
  notes TEXT,
  completed_at TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checklist_family ON checklist_tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_checklist_family_phase ON checklist_tasks(family_id, phase);
CREATE INDEX IF NOT EXISTS idx_checklist_family_status ON checklist_tasks(family_id, status);

-- 13. Idempotency Keys (Phase 5: Duplicate Operation Prevention & Safe Sync)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_idempotency_family ON idempotency_keys(family_id);

-- 14. Scan Documents & SmartScan Ingestion (Phase 6: Functional Document Extraction & Audit)
CREATE TABLE IF NOT EXISTS scan_documents (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  uploaded_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  ocr_status TEXT NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_engine TEXT NOT NULL DEFAULT 'local_tesseract' CHECK (ocr_engine IN ('local_tesseract', 'gemini_flash', 'manual')),
  extracted_text TEXT,
  confidence_score REAL DEFAULT 0,
  extracted_data TEXT, -- JSON structure of detected line items, totals, vendor, date
  import_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (import_status IN ('unreviewed', 'partially_imported', 'imported', 'discarded')),
  proposed_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scan_documents_family ON scan_documents(family_id);
CREATE INDEX IF NOT EXISTS idx_scan_documents_status ON scan_documents(family_id, ocr_status);
CREATE INDEX IF NOT EXISTS idx_scan_documents_import ON scan_documents(family_id, import_status);
