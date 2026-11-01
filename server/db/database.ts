import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

export interface DatabaseOptions {
  dbPath?: string;
  inMemory?: boolean;
}

export class AppDatabase {
  public db: DatabaseSync;

  constructor(options: DatabaseOptions = {}) {
    if (options.inMemory) {
      this.db = new DatabaseSync(':memory:');
    } else {
      const dbFile = options.dbPath || path.resolve(process.cwd(), 'data', 'shaadisaathi.db');
      const dir = path.dirname(dbFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.db = new DatabaseSync(dbFile);
    }

    this.initializeSchema();
    this.runMigrations();
  }

  private initializeSchema(): void {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    this.db.exec(schemaSql);
  }

  private runMigrations(): void {
    try {
      // Backward-compatible migration check for existing 'families' table
      const familyCols = this.db.prepare('PRAGMA table_info(families)').all() as Array<{ name: string }>;
      const familyColNames = familyCols.map((c) => c.name);

      if (familyColNames.length > 0) {
        if (!familyColNames.includes('total_budget_paise')) {
          this.db.exec('ALTER TABLE families ADD COLUMN total_budget_paise INTEGER NOT NULL DEFAULT 250000000');
        }
        if (!familyColNames.includes('budget_updated_by_user_id')) {
          this.db.exec('ALTER TABLE families ADD COLUMN budget_updated_by_user_id TEXT');
        }
      }
    } catch (err) {
      console.warn('[Database Migration Notice]', err);
    }
  }

  public close(): void {
    this.db.close();
  }
}

// Default singleton for normal application runtime
let defaultDbInstance: AppDatabase | null = null;

export const getDatabase = (options?: DatabaseOptions): AppDatabase => {
  if (options?.inMemory) {
    return new AppDatabase(options);
  }
  if (!defaultDbInstance) {
    defaultDbInstance = new AppDatabase(options);
  }
  return defaultDbInstance;
};
