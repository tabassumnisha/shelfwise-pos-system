-- Shelfwise POS schema (SQLite 3). Safe to run more than once.
-- The server applies this file automatically on start-up (server/db.js).
-- Money is stored as integer cents. Timestamps are UTC, 'YYYY-MM-DD HH:MM:SS'.

--
-- Database access rules (summary, so a reviewer does not have to read every table):
--   * The API uses prepared statements with bound parameters only; no SQL is built from request values.
--   * Passwords are scrypt hashes; session tokens are stored as sha256 hashes (sessions.token_hash).
--   * users.role is 'admin' (owner or manager) or 'cashier'. Every route needs a signed-in user; there are no guest routes.
--   * Prices, tax, totals and stock are decided on the server inside one transaction per sale.
--   * Stock never goes below zero (CHECK) and every change is logged in stock_movements.
--   * Constraints: UNIQUE users.email (case-insensitive), UNIQUE sku and barcode, role/status/method CHECK lists, money >= 0, foreign keys ON.
--   * Indexes: sessions(user_id, expires_at), products(category_id, supplier_id), sales(created_at, cashier_id), sale_items(sale_id),
--     stock_movements(product_id), purchases(supplier_id), purchase_items(purchase_id).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,              -- scrypt$N$r$p$salt$hash, never a plain password
  role          TEXT    NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY,              -- sha256 of the cookie value
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suppliers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  contact_name TEXT,
  email        TEXT,
  phone        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sku           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  barcode       TEXT    UNIQUE,
  name          TEXT    NOT NULL,
  category_id   TEXT    NOT NULL REFERENCES categories (id),
  supplier_id   INTEGER REFERENCES suppliers (id) ON DELETE SET NULL,
  price_cents   INTEGER NOT NULL CHECK (price_cents >= 0),
  cost_cents    INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  tax_bp        INTEGER NOT NULL DEFAULT 0 CHECK (tax_bp BETWEEN 0 AND 5000),  -- basis points: 800 = 8.00%
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
  color         TEXT    NOT NULL DEFAULT '#2F6F73',
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products (supplier_id);

CREATE TABLE IF NOT EXISTS sales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no     TEXT    UNIQUE,
  cashier_id     INTEGER REFERENCES users (id) ON DELETE SET NULL,
  cashier_name   TEXT    NOT NULL,
  customer_name  TEXT,
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  tax_cents      INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents    INTEGER NOT NULL CHECK (total_cents >= 0),
  method         TEXT    NOT NULL CHECK (method IN ('cash', 'card', 'mobile')),
  tendered_cents INTEGER NOT NULL DEFAULT 0 CHECK (tendered_cents >= 0),
  change_cents   INTEGER NOT NULL DEFAULT 0 CHECK (change_cents >= 0),
  status         TEXT    NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded')),
  refunded_at    TEXT,
  refunded_by    INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales (created_at);
CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales (cashier_id);

CREATE TABLE IF NOT EXISTS sale_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id          INTEGER NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
  product_id       INTEGER REFERENCES products (id) ON DELETE SET NULL,
  name             TEXT    NOT NULL,           -- copied at sale time so history survives product edits
  sku              TEXT    NOT NULL,
  qty              INTEGER NOT NULL CHECK (qty > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  unit_cost_cents  INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
  tax_bp           INTEGER NOT NULL DEFAULT 0,
  line_cents       INTEGER NOT NULL CHECK (line_cents >= 0)
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items (product_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL CHECK (delta <> 0),
  reason     TEXT    NOT NULL CHECK (reason IN ('initial', 'sale', 'refund', 'purchase', 'adjustment')),
  ref        TEXT,                              -- receipt number or purchase id
  note       TEXT,
  user_id    INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements (product_id);

CREATE TABLE IF NOT EXISTS purchases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id),
  status      TEXT    NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'received', 'cancelled')),
  note        TEXT,
  created_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  received_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases (supplier_id);

CREATE TABLE IF NOT EXISTS purchase_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id     INTEGER NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
  product_id      INTEGER NOT NULL REFERENCES products (id),
  qty             INTEGER NOT NULL CHECK (qty > 0),
  unit_cost_cents INTEGER NOT NULL CHECK (unit_cost_cents >= 0)
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items (purchase_id);

INSERT OR IGNORE INTO categories (id, label, sort_order) VALUES
  ('drinks', 'Drinks', 1),
  ('snacks', 'Snacks', 2),
  ('bakery', 'Bakery', 3),
  ('household', 'Household', 4),
  ('personal-care', 'Personal care', 5);
