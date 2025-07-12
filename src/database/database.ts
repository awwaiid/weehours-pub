import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { CREATE_TABLES_SQL } from './schema';

export interface RawMessage {
  id?: number;
  session_id: number;
  direction: 'incoming' | 'outgoing';
  content: string;
  content_stripped?: string;
  timestamp?: string;
}

export class Database {
  private db: sqlite3.Database;
  private runAsync: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  private getAsync: (sql: string, params?: any[]) => Promise<any>;
  public allAsync: (sql: string, params?: any[]) => Promise<any[]>;

  constructor(private dbPath: string = './weehours.db') {
    this.db = new sqlite3.Database(dbPath);
    
    this.runAsync = promisify(this.db.run.bind(this.db));
    this.getAsync = promisify(this.db.get.bind(this.db));
    this.allAsync = promisify(this.db.all.bind(this.db));
  }

  async initialize(): Promise<void> {
    try {
      console.log('Creating database tables...');
      
      for (let i = 0; i < CREATE_TABLES_SQL.length; i++) {
        const statement = CREATE_TABLES_SQL[i];
        console.log(`Executing statement ${i + 1}/${CREATE_TABLES_SQL.length}:`, statement.substring(0, 50) + '...');
        try {
          await this.runAsync(statement);
          console.log(`Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`Statement ${i + 1} failed:`, error);
          console.error('Failed statement:', statement);
          throw error;
        }
      }
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async logMessage(message: RawMessage): Promise<void> {
    const sql = `
      INSERT INTO raw_messages (session_id, direction, content, content_stripped, timestamp)
      VALUES (?, ?, ?, ?, datetime('now'))
    `;
    
    try {
      await this.runAsync(sql, [
        message.session_id,
        message.direction,
        message.content,
        message.content_stripped || this.stripAnsi(message.content)
      ]);
    } catch (error) {
      console.error('Failed to log message:', error);
    }
  }

  async logParsedEvent(event: any): Promise<void> {
    const sql = `
      INSERT INTO parsed_events (session_id, event_type, data, timestamp)
      VALUES (?, ?, ?, datetime('now'))
    `;
    
    try {
      await this.runAsync(sql, [
        event.session_id,
        event.event_type,
        JSON.stringify(event.data)
      ]);
    } catch (error) {
      console.error('Failed to log parsed event:', error);
      throw error;
    }
  }

  async getRecentMessages(sessionId: number = 1, limit: number = 100): Promise<RawMessage[]> {
    const sql = `
      SELECT * FROM raw_messages 
      WHERE session_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    try {
      return await this.allAsync(sql, [sessionId, limit]);
    } catch (error) {
      console.error('Failed to get recent messages:', error);
      return [];
    }
  }

  private stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        }
        resolve();
      });
    });
  }
}