CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done')),
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
