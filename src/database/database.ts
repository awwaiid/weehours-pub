import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { CREATE_TABLES_SQL } from './schema';

export interface RawMessage {
  id?: number;
  user_session_id: string;
  direction: 'incoming' | 'outgoing';
  content: string;
  content_stripped?: string;
  timestamp?: string;
}

export interface UserSession {
  id: string;
  user_id?: string;
  username?: string;
  password?: string;
  created_at?: string;
  last_activity?: string;
  expires_at?: string;
  active?: boolean;
  mud_connected?: boolean;
  connection_status?: string;
}

export class Database {
  private static instance: Database;
  private db: sqlite3.Database;
  private runAsync: (sql: string, params?: unknown[]) => Promise<sqlite3.RunResult>;
  private getAsync: (sql: string, params?: unknown[]) => Promise<unknown>;
  public allAsync: (sql: string, params?: unknown[]) => Promise<unknown[]>;

  private constructor(private dbPath: string = './data/weehours.db') {
    this.db = new sqlite3.Database(dbPath);
    
    this.runAsync = promisify(this.db.run.bind(this.db));
    this.getAsync = promisify(this.db.get.bind(this.db));
    this.allAsync = promisify(this.db.all.bind(this.db));
  }

  public static getInstance(dbPath?: string): Database {
    if (!Database.instance) {
      Database.instance = new Database(dbPath);
    }
    return Database.instance;
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
      INSERT INTO raw_messages (user_session_id, direction, content, content_stripped, timestamp)
      VALUES (?, ?, ?, ?, datetime('now'))
    `;
    
    try {
      await this.runAsync(sql, [
        message.user_session_id,
        message.direction,
        message.content,
        message.content_stripped || this.stripAnsi(message.content)
      ]);
    } catch (error) {
      console.error('Failed to log message:', error);
    }
  }

  async logParsedEvent(event: { user_session_id: string; event_type: string; data: unknown }): Promise<void> {
    const sql = `
      INSERT INTO parsed_events (user_session_id, event_type, data, timestamp)
      VALUES (?, ?, ?, datetime('now'))
    `;
    
    try {
      await this.runAsync(sql, [
        event.user_session_id,
        event.event_type,
        JSON.stringify(event.data)
      ]);
    } catch (error) {
      console.error('Failed to log parsed event:', error);
      throw error;
    }
  }

  async createUserSession(
    sessionId: string, 
    userId?: string, 
    username?: string, 
    password?: string, 
    expiresIn: number = 24 * 60 * 60 * 1000
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn).toISOString();
    const sql = `
      INSERT INTO user_sessions (id, user_id, username, password, expires_at, created_at, last_activity)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    try {
      await this.runAsync(sql, [sessionId, userId, username, password, expiresAt]);
    } catch (error) {
      console.error('Failed to create user session:', error);
      throw error;
    }
  }

  async getUserSession(sessionId: string): Promise<UserSession | null> {
    const sql = 'SELECT * FROM user_sessions WHERE id = ? AND active = TRUE AND expires_at > datetime("now")';
    
    try {
      const result = await this.getAsync(sql, [sessionId]) as UserSession;
      return result || null;
    } catch (error) {
      console.error('Failed to get user session:', error);
      return null;
    }
  }

  async getUserSessionByUsername(username: string): Promise<UserSession | null> {
    const sql = 'SELECT * FROM user_sessions WHERE username = ? AND active = TRUE AND expires_at > datetime("now") ORDER BY last_activity DESC LIMIT 1';
    
    try {
      const result = await this.getAsync(sql, [username]) as UserSession;
      return result || null;
    } catch (error) {
      console.error('Failed to get user session by username:', error);
      return null;
    }
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const sql = 'UPDATE user_sessions SET last_activity = datetime("now") WHERE id = ?';
    
    try {
      await this.runAsync(sql, [sessionId]);
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  async deactivateUserSession(sessionId: string): Promise<void> {
    const sql = 'UPDATE user_sessions SET active = FALSE WHERE id = ?';
    
    try {
      await this.runAsync(sql, [sessionId]);
    } catch (error) {
      console.error('Failed to deactivate user session:', error);
      throw error;
    }
  }

  async getRecentMessages(userSessionId: string, limit: number = 100): Promise<RawMessage[]> {
    const sql = `
      SELECT * FROM raw_messages 
      WHERE user_session_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    try {
      const result = await this.allAsync(sql, [userSessionId, limit]);
      return result as RawMessage[];
    } catch (error) {
      console.error('Failed to get recent messages:', error);
      return [];
    }
  }

  async getRecentEvents(userSessionId: string, limit: number = 100): Promise<any[]> {
    const sql = `
      SELECT * FROM parsed_events 
      WHERE user_session_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    try {
      const result = await this.allAsync(sql, [userSessionId, limit]);
      return result.map((row: any) => ({
        ...row,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      }));
    } catch (error) {
      console.error('Failed to get recent events:', error);
      return [];
    }
  }

  async updateMudConnectionStatus(sessionId: string, connected: boolean, status: string): Promise<void> {
    const sql = 'UPDATE user_sessions SET mud_connected = ?, connection_status = ?, last_activity = datetime("now") WHERE id = ?';
    
    try {
      await this.runAsync(sql, [connected, status, sessionId]);
    } catch (error) {
      console.error('Failed to update MUD connection status:', error);
    }
  }

  private stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err);
        } else {
          console.log('✅ SQLite database connection closed');
        }
        resolve();
      });
    });
  }
}