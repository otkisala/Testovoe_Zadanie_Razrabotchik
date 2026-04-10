import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../../data/tasks.db');
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

// Ensure the data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function runMigrations(): void {
  // Create migrations tracking table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const appliedMigrations = db
    .prepare('SELECT filename FROM _migrations')
    .all() as { filename: string }[];
  const appliedSet = new Set(appliedMigrations.map((m) => m.filename));

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found, skipping migrations.');
    return;
  }

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const filename of migrationFiles) {
    if (!appliedSet.has(filename)) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(filename);
      console.log(`Applied migration: ${filename}`);
    }
  }
}

runMigrations();

export default db;
