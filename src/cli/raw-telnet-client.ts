import * as net from 'net';
import * as readline from 'readline';
import { Database } from '../database/database';
import { MessageParser } from '../parser/message-parser';

export interface MudConnection {
  host: string;
  port: number;
  username: string;
  password: string;
}

export class RawMudTelnetClient {
  private socket: net.Socket;
  private rl: readline.Interface;
  private isConnected = false;
  private database: Database;
  private parser: MessageParser;
  private loginState = 'waiting'; // 'waiting', 'username', 'password', 'logged_in'
  private messageCounter = 0;

  constructor(private config: MudConnection) {
    this.socket = new net.Socket();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.database = new Database();
    this.parser = new MessageParser();
  }

  async connect(): Promise<void> {
    try {
      console.log('Initializing database...');
      await this.database.initialize();
      
      console.log(`[DEBUG] Connecting to ${this.config.host}:${this.config.port}...`);
      
      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        this.socket.connect(this.config.port, this.config.host, () => {
          console.log('[DEBUG] Raw socket connected!');
          this.isConnected = true;
          this.startInputLoop();
          resolve();
        });

        this.socket.on('error', (error) => {
          console.error('[DEBUG] Socket connection error:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    console.log('[DEBUG] Setting up raw socket event handlers...');
    
    this.socket.on('connect', () => {
      console.log('[DEBUG] Socket connect event fired!');
    });
    
    this.socket.on('data', async (data: Buffer) => {
      const text = data.toString();
      this.messageCounter++;
      
      // Debug output - show raw text content
      console.log('\n[DEBUG INCOMING]:', JSON.stringify(text));
      
      // Handle telnet protocol bytes (basic)
      const cleanText = this.processTelnetData(data);
      if (cleanText) {
        process.stdout.write(cleanText);
      }
      
      // Auto-login logic
      await this.handleAutoLogin(text);
      
      // Store raw message (using default session for CLI)
      await this.database.logMessage({
        user_session_id: 'cli-session',
        direction: 'incoming',
        content: text
      });
      
      // Parse message into events and store them
      try {
        const events = this.parser.parseMessage(this.messageCounter, text, new Date().toISOString());
        for (const event of events) {
          await this.database.logParsedEvent({
            user_session_id: 'cli-session',
            event_type: event.event_type,
            data: event.data
          });
          console.log(`[PARSED] ${event.event_type}: ${JSON.stringify(event.data).substring(0, 100)}...`);
        }
      } catch (error) {
        console.error('Parser error:', error);
      }
    });

    this.socket.on('close', () => {
      console.log('\n[DEBUG] Socket closed event fired.');
      this.isConnected = false;
      this.rl.close();
      process.exit(0);
    });

    this.socket.on('error', (error: Error) => {
      console.error('[DEBUG] Socket error event fired:', error);
      this.disconnect();
    });
    
    console.log('[DEBUG] Raw socket event handlers set up complete.');
  }

  private processTelnetData(data: Buffer): string {
    // Basic telnet protocol handling - filter out negotiation
    let result = '';
    let i = 0;
    
    while (i < data.length) {
      const byte = data[i];
      
      if (byte === 0xFF) { // IAC (Interpret As Command)
        // Skip telnet negotiation sequences
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
      console.log('[DEBUG] Detected name prompt, sending username...');
      this.loginState = 'username';
      await this.sleep(500);
      await this.sendCommand(this.config.username);
    } else if (this.loginState === 'username' && text.includes('Password:')) {
      console.log('[DEBUG] Detected password prompt, sending password...');
      this.loginState = 'password';
      await this.sleep(500);
      await this.sendCommand(this.config.password);
    } else if (this.loginState === 'password' && text.includes('entered the game')) {
      console.log('[DEBUG] Login successful!');
      this.loginState = 'logged_in';
    }
  }

  private startInputLoop(): void {
    this.rl.on('line', async (input: string) => {
      if (this.isConnected && this.loginState === 'logged_in') {
        await this.sendCommand(input);
      } else if (this.isConnected) {
        console.log('[DEBUG] Ignoring input during login process:', input);
      }
    });

    this.rl.on('SIGINT', () => {
      console.log('\nDisconnecting...');
      this.disconnect();
    });
  }

  private async sendCommand(command: string): Promise<void> {
    try {
      console.log('[DEBUG OUTGOING]:', JSON.stringify(command));
      
      this.socket.write(command + '\n');
      
      // Store raw outgoing message
      await this.database.logMessage({
        user_session_id: 'cli-session',
        direction: 'outgoing',
        content: command
      });
      
      // Create a simple command event
      await this.database.logParsedEvent({
        user_session_id: 'cli-session',
        event_type: 'user_command',
        data: {
          command: command.trim(),
          player: 'Awwaiid'
        }
      });
      console.log(`[PARSED] user_command: ${command}`);
      
    } catch (error) {
      console.error('Error sending command:', error);
    }
  }

  private async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        this.socket.destroy();
        this.isConnected = false;
      } catch (error) {
        console.error('Error during disconnect:', error);
      }
    }
    
    await this.database.close();
    this.rl.close();
    process.exit(0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}