CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  label TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  client_code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  ci_ruc TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  payment_condition TEXT NOT NULL DEFAULT 'Contado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_vehicles (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  engine TEXT NOT NULL DEFAULT '',
  plate TEXT NOT NULL DEFAULT '',
  transmission TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS stock_items (
  id SERIAL PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  supplier TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tire_records (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  ci_ruc TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  tire_size TEXT NOT NULL DEFAULT '',
  tire_brand TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL DEFAULT '',
  plate TEXT NOT NULL DEFAULT '',
  service_date DATE NOT NULL,
  end_date DATE,
  currency TEXT NOT NULL DEFAULT 'PYG',
  payment_condition TEXT NOT NULL DEFAULT 'Contado',
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_items (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS receivables (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL DEFAULT '',
  plate TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  service_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PYG',
  original_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  applied_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  payment_date TIMESTAMPTZ,
  payment_method TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL DEFAULT '',
  receivable_id INTEGER REFERENCES receivables(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'total',
  payment_method TEXT NOT NULL DEFAULT 'Efectivo',
  currency TEXT NOT NULL DEFAULT 'PYG',
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  client_name TEXT NOT NULL DEFAULT '',
  ci_ruc TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PYG',
  payment_method TEXT NOT NULL DEFAULT 'Efectivo',
  stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  ci_ruc TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  age INTEGER,
  debt NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_entries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id SERIAL PRIMARY KEY,
  owner_username TEXT NOT NULL,
  opening_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_receivables_client ON receivables (client_id);
CREATE INDEX IF NOT EXISTS idx_receivables_paid ON receivables (paid);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs (client_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_client ON debt_payments (client_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_owner ON cash_sessions (owner_username);
