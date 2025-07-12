import * as net from 'net';
import { Database, UserSession } from '../database/database';
import { MessageParser } from '../parser/message-parser';

export type ConnectionState = 'disconnected' | 'connecting' | 'login' | 'connected' | 'error';
export type LoginState = 'waiting' | 'username' | 'password' | 'logged_in';

export interface ConnectionStatus {
  sessionId: string;
  state: ConnectionState;
  loginState: LoginState;
  isConnected: boolean;
  connectionTime?: Date;
  lastActivity?: Date;
  messageCount: number;
}

export class UserMudConnection {
  private socket: net.Socket;
  private database: Database;
  private parser: MessageParser;
  private state: ConnectionState = 'disconnected';
  private loginState: LoginState = 'waiting';
  private messageCounter = 0;
  private connectionTime?: Date;
  private lastActivity?: Date;

  constructor(
    private userSession: UserSession,
    private onMessage: (sessionId: string, message: string, isOutgoing?: boolean) => void,
    private onStateChange: (sessionId: string, status: ConnectionStatus) => void
  ) {
    this.socket = new net.Socket();
    this.database = new Database();
    this.parser = new MessageParser();
  }

  async connect(): Promise<void> {
    if (this.state !== 'disconnected') {
      throw new Error('Connection is already active or connecting');
    }

    if (!this.userSession.username || !this.userSession.password) {
      throw new Error('MUD credentials are required for connection');
    }

    try {
      this.setState('connecting');
      await this.database.initialize();
      
      // Update database connection status
      await this.database.updateMudConnectionStatus(this.userSession.id, false, 'connecting');
      
      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.setState('error');
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket.connect(2000, 'weehours.net', () => {
          clearTimeout(timeout);
          this.connectionTime = new Date();
          this.setState('login');
          resolve();
        });

        this.socket.on('error', (error) => {
          clearTimeout(timeout);
          this.setState('error');
          reject(error);
        });
      });

    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.socket.on('data', async (data: Buffer) => {
      const text = data.toString();
      this.messageCounter++;
      this.lastActivity = new Date();
      
      const cleanText = this.processTelnetData(data);
      if (cleanText) {
        this.onMessage(this.userSession.id, cleanText);
      }
      
      await this.handleAutoLogin(text);
      
      // Store raw message with user session ID
      await this.database.logMessage({
        user_session_id: this.userSession.id,
        direction: 'incoming',
        content: text
      });
      
      // Parse message into events and store them
      try {
        const events = this.parser.parseMessage(this.messageCounter, text, new Date().toISOString());
        for (const event of events) {
          await this.database.logParsedEvent({
            user_session_id: this.userSession.id,
            event_type: event.event_type,
            data: event.data
          });
        }
      } catch (error) {
        console.error(`Parser error for user session ${this.userSession.id}:`, error);
      }

      this.notifyStateChange();
    });

    this.socket.on('close', () => {
      this.setState('disconnected');
      this.connectionTime = undefined;
    });

    this.socket.on('error', () => {
      this.setState('error');
    });
  }

  private processTelnetData(data: Buffer): string {
    let result = '';
    let i = 0;
    
    while (i < data.length) {
      const byte = data[i];
      
      if (byte === 0xFF) { // IAC (Interpret As Command)
        if (i + 2 < data.length) {
          i += 3; // Skip IAC + command + option
        } else {
          i++; // Skip just the IAC if incomplete
        }
      } else {
        result += String.fromCharCode(byte);
        i++;
      }
    }
    
    return result;
  }

  private async handleAutoLogin(text: string): Promise<void> {
    if (this.loginState === 'waiting' && text.includes('What is your name:')) {
      this.loginState = 'username';
      await this.sleep(500);
      await this.sendCommand(this.userSession.username!);
    } else if (this.loginState === 'username' && text.includes('Password:')) {
      this.loginState = 'password';
      await this.sleep(500);
      await this.sendCommand(this.userSession.password!);
    } else if (this.loginState === 'password' && text.includes('entered the game')) {
      this.loginState = 'logged_in';
      this.setState('connected');
      await this.database.updateMudConnectionStatus(this.userSession.id, true, 'connected');
    }
  }

  async sendCommand(command: string): Promise<void> {
    if (this.state === 'disconnected' || this.state === 'error') {
      throw new Error('Connection is not active');
    }

    try {
      this.socket.write(command + '\n');
      this.lastActivity = new Date();
      
      this.onMessage(this.userSession.id, command, true);
      
      // Store raw outgoing message
      await this.database.logMessage({
        user_session_id: this.userSession.id,
        direction: 'outgoing',
        content: command
      });
      
      // Create a command event
      await this.database.logParsedEvent({
        user_session_id: this.userSession.id,
        event_type: 'user_command',
        data: {
          command: command.trim(),
          player: this.userSession.username
        }
      });
      
    } catch (error) {
      console.error(`Error sending command for user session ${this.userSession.id}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.state !== 'disconnected') {
      try {
        this.socket.destroy();
      } catch (error) {
        console.error(`Error disconnecting user session ${this.userSession.id}:`, error);
      }
      this.setState('disconnected');
      await this.database.updateMudConnectionStatus(this.userSession.id, false, 'disconnected');
    }
    
    await this.database.close();
  }

  getStatus(): ConnectionStatus {
    return {
      sessionId: this.userSession.id,
      state: this.state,
      loginState: this.loginState,
      isConnected: this.state === 'connected',
      connectionTime: this.connectionTime,
      lastActivity: this.lastActivity,
      messageCount: this.messageCounter
    };
  }

  getUserSession(): UserSession {
    return { ...this.userSession };
  }

  private setState(newState: ConnectionState): void {
    this.state = newState;
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.onStateChange(this.userSession.id, this.getStatus());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}