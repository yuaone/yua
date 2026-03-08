import Database from 'better-sqlite3';
import { app, ipcMain } from 'electron';
import path from 'node:path';

let db: Database.Database | null = null;

function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'yua-cache.db');
}

export function initSqliteCache(): void {
  try {
    const dbPath = getDbPath();
    db = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        title TEXT,
        project_id TEXT,
        pinned INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        data TEXT,
        sync_version INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT,
        created_at TEXT,
        data TEXT,
        sync_version INTEGER DEFAULT 0,
        FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
      CREATE INDEX IF NOT EXISTS idx_threads_updated ON threads(updated_at);

      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        content, content=messages, content_rowid=rowid
      );

      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        retry_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS cache_meta (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    registerCacheIpc();
  } catch (err) {
    console.error('[SQLite] Failed to initialize cache:', err);
    db = null;
  }
}

function registerCacheIpc(): void {
  // Cache threads
  ipcMain.handle('cache:set-threads', (_event, threads: any[]) => {
    if (!db) return false;
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO threads (id, title, project_id, pinned, created_at, updated_at, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const tx = db.transaction((items: any[]) => {
        for (const t of items) {
          stmt.run(
            String(t.id),
            t.title ?? '',
            t.projectId ?? null,
            t.pinned ? 1 : 0,
            t.createdAt ?? new Date().toISOString(),
            t.updatedAt ?? new Date().toISOString(),
            JSON.stringify(t),
          );
        }
      });
      tx(threads);
      return true;
    } catch {
      return false;
    }
  });

  // Get cached threads
  ipcMain.handle('cache:get-threads', (_event, projectId?: string) => {
    if (!db) return [];
    try {
      if (projectId) {
        return db
          .prepare(
            'SELECT data FROM threads WHERE project_id = ? ORDER BY updated_at DESC',
          )
          .all(projectId)
          .map((r: any) => JSON.parse(r.data));
      }
      return db
        .prepare('SELECT data FROM threads ORDER BY updated_at DESC')
        .all()
        .map((r: any) => JSON.parse(r.data));
    } catch {
      return [];
    }
  });

  // Cache messages for a thread
  ipcMain.handle(
    'cache:set-messages',
    (_event, threadId: string, messages: any[]) => {
      if (!db) return false;
      try {
        const stmt = db.prepare(`
        INSERT OR REPLACE INTO messages (id, thread_id, role, content, created_at, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
        const tx = db.transaction((items: any[]) => {
          for (const m of items) {
            stmt.run(
              String(m.id ?? m._id ?? `${threadId}-${Date.now()}`),
              threadId,
              m.role ?? 'user',
              typeof m.content === 'string'
                ? m.content
                : JSON.stringify(m.content),
              m.createdAt ?? new Date().toISOString(),
              JSON.stringify(m),
            );
          }
        });
        tx(messages);
        return true;
      } catch {
        return false;
      }
    },
  );

  // Get cached messages for a thread
  ipcMain.handle('cache:get-messages', (_event, threadId: string) => {
    if (!db) return [];
    try {
      return db
        .prepare(
          'SELECT data FROM messages WHERE thread_id = ? ORDER BY created_at ASC',
        )
        .all(threadId)
        .map((r: any) => JSON.parse(r.data));
    } catch {
      return [];
    }
  });

  // Set cache metadata
  ipcMain.handle('cache:set-meta', (_event, key: string, value: string) => {
    if (!db) return false;
    try {
      db.prepare(
        `INSERT OR REPLACE INTO cache_meta (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      ).run(key, value);
      return true;
    } catch {
      return false;
    }
  });

  // Get cache metadata
  ipcMain.handle('cache:get-meta', (_event, key: string) => {
    if (!db) return null;
    try {
      const row = db
        .prepare('SELECT value FROM cache_meta WHERE key = ?')
        .get(key) as any;
      return row?.value ?? null;
    } catch {
      return null;
    }
  });

  // Outbox operations (offline queue)
  ipcMain.handle('cache:outbox-push', (_event, action: string, payload: string) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('INSERT INTO outbox (action, payload) VALUES (?, ?)');
      stmt.run(action, payload);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('cache:outbox-list', () => {
    if (!db) return [];
    try {
      return db.prepare("SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at").all();
    } catch {
      return [];
    }
  });

  ipcMain.handle('cache:outbox-complete', (_event, id: number) => {
    if (!db) return false;
    try {
      db.prepare("UPDATE outbox SET status = 'completed' WHERE id = ?").run(id);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('cache:outbox-retry', (_event, id: number) => {
    if (!db) return false;
    try {
      db.prepare("UPDATE outbox SET retry_count = retry_count + 1 WHERE id = ?").run(id);
      return true;
    } catch {
      return false;
    }
  });

  // FTS search
  ipcMain.handle('cache:search-messages', (_event, query: string) => {
    if (!db) return [];
    try {
      return db.prepare(
        'SELECT m.* FROM messages m JOIN messages_fts fts ON m.rowid = fts.rowid WHERE messages_fts MATCH ? ORDER BY rank LIMIT 50'
      ).all(query);
    } catch {
      return [];
    }
  });

  // Clear all cache
  ipcMain.handle('cache:clear', () => {
    if (!db) return false;
    try {
      db.exec('DELETE FROM messages; DELETE FROM threads; DELETE FROM cache_meta;');
      return true;
    } catch {
      return false;
    }
  });
}

export function closeSqliteCache(): void {
  try {
    db?.close();
    db = null;
  } catch {
    // ignore
  }
}
