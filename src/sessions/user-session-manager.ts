import { randomBytes } from 'crypto';
import { Database, UserSession, RawMessage } from '../database/database';
import { UserMudConnection, ConnectionStatus } from './user-mud-connection';

export class UserSessionManager {
  private database: Database;
  private activeConnections: Map<string, UserMudConnection> = new Map();

  constructor() {
    this.database = Database.getInstance();
  }

  async initialize(): Promise<void> {
    await this.database.initialize();
  }

  generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  async createSession(
    userId?: string, 
    username?: string, 
    password?: string, 
    expiresInMs: number = 24 * 60 * 60 * 1000
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    await this.database.createUserSession(sessionId, userId, username, password, expiresInMs);
    return sessionId;
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    const session = await this.database.getUserSession(sessionId);
    if (session) {
      // Update last activity
      await this.database.updateSessionActivity(sessionId);
    }
    return session;
  }

  async getSessionByUsername(username: string): Promise<UserSession | null> {
    const session = await this.database.getUserSessionByUsername(username);
    if (session) {
      // Update last activity
      await this.database.updateSessionActivity(session.id);
    }
    return session;
  }

  async isValidSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.disconnectMud(sessionId);
    await this.database.deactivateUserSession(sessionId);
  }

  async connectMudForUser(
    sessionId: string, 
    onMessage?: (sessionId: string, message: string, isOutgoing?: boolean) => void, 
    onStateChange?: (sessionId: string, status: ConnectionStatus) => void
  ): Promise<void> {
    const userSession = await this.getSession(sessionId);
    if (!userSession) {
      throw new Error('Invalid session ID');
    }

    if (this.activeConnections.has(sessionId)) {
      throw new Error('User already has an active MUD connection');
    }

    const connection = new UserMudConnection(
      userSession,
      onMessage || (() => {}),
      onStateChange || (() => {})
    );

    await connection.connect();
    this.activeConnections.set(sessionId, connection);
  }

  async disconnectMud(sessionId: string): Promise<void> {
    const connection = this.activeConnections.get(sessionId);
    if (connection) {
      await connection.disconnect();
      this.activeConnections.delete(sessionId);
    }
  }

  async sendMudCommand(sessionId: string, command: string): Promise<void> {
    const connection = this.activeConnections.get(sessionId);
    if (!connection) {
      throw new Error('No active MUD connection for this session');
    }
    await connection.sendCommand(command);
  }

  getMudConnection(sessionId: string): UserMudConnection | undefined {
    return this.activeConnections.get(sessionId);
  }

  getActiveConnections(): string[] {
    return Array.from(this.activeConnections.keys());
  }

  async getConnectionStatus(sessionId: string): Promise<ConnectionStatus> {
    const connection = this.activeConnections.get(sessionId);
    if (!connection) {
      return { 
        sessionId, 
        state: 'disconnected' as const, 
        loginState: 'waiting' as const, 
        isConnected: false,
        messageCount: 0 
      };
    }
    return connection.getStatus();
  }

  async getRecentMessages(sessionId: string, limit: number = 100): Promise<RawMessage[]> {
    return await this.database.getRecentMessages(sessionId, limit);
  }

  async getRecentEvents(sessionId: string, limit: number = 100): Promise<any[]> {
    return await this.database.getRecentEvents(sessionId, limit);
  }

  async cleanupExpiredSessions(): Promise<void> {
    // Disconnect MUD connections for expired sessions
    const expiredSessions = Array.from(this.activeConnections.keys());
    for (const sessionId of expiredSessions) {
      const session = await this.database.getUserSession(sessionId);
      if (!session) {
        // Session expired, disconnect MUD
        await this.disconnectMud(sessionId);
      }
    }
    console.log('Cleaned up expired sessions');
  }

  async close(): Promise<void> {
    console.log(`🔄 Closing ${this.activeConnections.size} active MUD connections...`);
    // Disconnect all active MUD connections
    const disconnectPromises = Array.from(this.activeConnections.values()).map(conn => conn.disconnect());
    await Promise.all(disconnectPromises);
    this.activeConnections.clear();
    console.log('✅ All MUD connections closed');
    
    console.log('🔄 Closing database...');
    await this.database.close();
    console.log('✅ Database closed');
  }
}