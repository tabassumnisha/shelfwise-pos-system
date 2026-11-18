import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { config } from './config.js'
import { hashPassword } from './auth.js'

const read = (f) => fs.readFileSync(path.join(config.databaseDir, f), 'utf8')

export function openDb(file = config.dbPath) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  db.exec(read('schema.sql'))
  return db
}

export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

const TABLES = new Set(['users', 'products', 'sales']) // fixed list: the table name is never user input
const count = (db, t) => {
  if (!TABLES.has(t)) throw new Error('unknown table')
  return db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c
}

// Demo accounts come from config.demo (ids 1 and 2 are what the sample sales point at). Hashed here, never stored in SQL.
function seedDemoUsers(db) {
  const add = db.prepare('INSERT OR IGNORE INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)')
  add.run(1, config.demo.admin.email.toLowerCase(), 'Alex Morgan', hashPassword(config.demo.admin.password), 'admin')
  add.run(2, config.demo.cashier.email.toLowerCase(), 'Riley Chen', hashPassword(config.demo.cashier.password), 'cashier')
}

// Called once at start-up. Demo mode loads the sample data into an empty database.
// Production mode creates a single admin from ADMIN_EMAIL / ADMIN_PASSWORD and nothing else.
export function bootstrap(db) {
  if (config.demoMode) {
    if (count(db, 'users') === 0 && count(db, 'products') === 0) tx(db, () => { seedDemoUsers(db); db.exec(read('seed.sql')) })
    return
  }
  if (count(db, 'users') === 0) {
    if (!config.adminEmail || config.adminPassword.length < 10) {
      console.warn('[shelfwise-pos] No users yet. Set ADMIN_EMAIL and an ADMIN_PASSWORD of 10+ characters to create the first admin.')
      return
    }
    db.prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, 'Shop Admin', ?, 'admin')").run(config.adminEmail, hashPassword(config.adminPassword))
    console.log(`[shelfwise-pos] Created admin ${config.adminEmail}`)
  }
}

// Demo mode only: wipe sales, stock, products, suppliers and extra accounts, then reload the sample data.
export function resetDemo(db) {
  tx(db, () => {
    db.exec(`DELETE FROM sales; DELETE FROM purchases; DELETE FROM stock_movements; DELETE FROM products; DELETE FROM suppliers;
      DELETE FROM users WHERE id NOT IN (1, 2); DELETE FROM sqlite_sequence WHERE name IN ('sales','purchases','products','suppliers','sale_items','purchase_items','stock_movements');`)
    db.prepare('UPDATE users SET active = 1 WHERE id IN (1, 2)').run()
    seedDemoUsers(db)
    db.exec(read('seed.sql'))
  })
}
