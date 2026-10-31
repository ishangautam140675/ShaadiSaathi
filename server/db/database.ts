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
  }

  private initializeSchema(): void {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    this.db.exec(schemaSql);
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
