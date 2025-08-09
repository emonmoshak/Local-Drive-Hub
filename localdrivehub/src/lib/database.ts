import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

// Enable verbose mode for debugging
const Database = sqlite3.verbose().Database;

export interface Account {
  id: string;
  email: string;
  name: string;
  refresh_token: string; // encrypted
  access_token?: string;
  token_expiry?: number;
  quota_bytes_total?: number;
  quota_bytes_used?: number;
  created_at: number;
  updated_at: number;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  account_id: string;
  drive_file_id: string;
  parent_id?: string;
  modified_time: string;
  created_time: string;
  thumbnail_link?: string;
  web_view_link?: string;
  download_link?: string;
  indexed_at: number;
}

export interface Upload {
  id: string;
  file_name: string;
  file_size: number;
  target_account_id: string;
  upload_session_id?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused';
  progress_bytes: number;
  created_at: number;
  completed_at?: number;
  error_message?: string;
}

class LocalDatabase {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    // Store database in the app directory
    this.dbPath = path.join(process.cwd(), 'localdrivehub.db');
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
          return;
        }
        console.log('Connected to SQLite database at:', this.dbPath);
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));

    // Accounts table
    await run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        access_token TEXT,
        token_expiry INTEGER,
        quota_bytes_total INTEGER,
        quota_bytes_used INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Files metadata table
    await run(`
      CREATE TABLE IF NOT EXISTS files_metadata (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        account_id TEXT NOT NULL,
        drive_file_id TEXT NOT NULL,
        parent_id TEXT,
        modified_time TEXT NOT NULL,
        created_time TEXT NOT NULL,
        thumbnail_link TEXT,
        web_view_link TEXT,
        download_link TEXT,
        indexed_at INTEGER NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
      )
    `);

    // Uploads table
    await run(`
      CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        target_account_id TEXT NOT NULL,
        upload_session_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        progress_bytes INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        error_message TEXT,
        FOREIGN KEY (target_account_id) REFERENCES accounts (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await run(`CREATE INDEX IF NOT EXISTS idx_files_account ON files_metadata (account_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_files_drive_id ON files_metadata (drive_file_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_uploads_account ON uploads (target_account_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads (status)`);

    console.log('Database tables created successfully');
  }

  // Account operations
  async saveAccount(account: Account): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    await run(`
      INSERT OR REPLACE INTO accounts 
      (id, email, name, refresh_token, access_token, token_expiry, quota_bytes_total, quota_bytes_used, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      account.id,
      account.email,
      account.name,
      account.refresh_token,
      account.access_token,
      account.token_expiry,
      account.quota_bytes_total,
      account.quota_bytes_used,
      account.created_at,
      account.updated_at
    ]);
  }

  async getAccounts(): Promise<Account[]> {
    if (!this.db) throw new Error('Database not initialized');

    const all = promisify(this.db.all.bind(this.db));
    const rows = await all('SELECT * FROM accounts ORDER BY created_at ASC');
    return rows as Account[];
  }

  async getAccount(id: string): Promise<Account | null> {
    if (!this.db) throw new Error('Database not initialized');

    const get = promisify(this.db.get.bind(this.db));
    const row = await get('SELECT * FROM accounts WHERE id = ?', [id]);
    return row as Account | null;
  }

  async deleteAccount(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    await run('DELETE FROM accounts WHERE id = ?', [id]);
  }

  // File metadata operations
  async saveFileMetadata(files: FileMetadata[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    
    await run('BEGIN TRANSACTION');
    
    try {
      for (const file of files) {
        await run(`
          INSERT OR REPLACE INTO files_metadata 
          (id, name, size, mime_type, account_id, drive_file_id, parent_id, modified_time, created_time, thumbnail_link, web_view_link, download_link, indexed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          file.id,
          file.name,
          file.size,
          file.mime_type,
          file.account_id,
          file.drive_file_id,
          file.parent_id,
          file.modified_time,
          file.created_time,
          file.thumbnail_link,
          file.web_view_link,
          file.download_link,
          file.indexed_at
        ]);
      }
      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  }

  async getFiles(accountId?: string, searchQuery?: string): Promise<FileMetadata[]> {
    if (!this.db) throw new Error('Database not initialized');

    const all = promisify(this.db.all.bind(this.db));
    
    let query = 'SELECT * FROM files_metadata';
    const params: any[] = [];
    
    if (accountId) {
      query += ' WHERE account_id = ?';
      params.push(accountId);
    }
    
    if (searchQuery) {
      query += accountId ? ' AND' : ' WHERE';
      query += ' name LIKE ?';
      params.push(`%${searchQuery}%`);
    }
    
    query += ' ORDER BY modified_time DESC';
    
    const rows = await all(query, params);
    return rows as FileMetadata[];
  }

  async clearFileMetadata(accountId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    await run('DELETE FROM files_metadata WHERE account_id = ?', [accountId]);
  }

  // Upload operations
  async saveUpload(upload: Upload): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    await run(`
      INSERT OR REPLACE INTO uploads 
      (id, file_name, file_size, target_account_id, upload_session_id, status, progress_bytes, created_at, completed_at, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      upload.id,
      upload.file_name,
      upload.file_size,
      upload.target_account_id,
      upload.upload_session_id,
      upload.status,
      upload.progress_bytes,
      upload.created_at,
      upload.completed_at,
      upload.error_message
    ]);
  }

  async getUploads(status?: string): Promise<Upload[]> {
    if (!this.db) throw new Error('Database not initialized');

    const all = promisify(this.db.all.bind(this.db));
    
    let query = 'SELECT * FROM uploads';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const rows = await all(query, params);
    return rows as Upload[];
  }

  async updateUploadProgress(id: string, progressBytes: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    await run('UPDATE uploads SET progress_bytes = ? WHERE id = ?', [progressBytes, id]);
  }

  async updateUploadStatus(id: string, status: Upload['status'], errorMessage?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    const completedAt = status === 'completed' ? Date.now() : null;
    await run('UPDATE uploads SET status = ?, completed_at = ?, error_message = ? WHERE id = ?', 
      [status, completedAt, errorMessage, id]);
  }

  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('Database connection closed');
          this.db = null;
          resolve();
        }
      });
    });
  }
}

// Singleton instance
let database: LocalDatabase | null = null;

export async function getDatabase(): Promise<LocalDatabase> {
  if (!database) {
    database = new LocalDatabase();
    await database.init();
  }
  return database;
}

export { LocalDatabase };
