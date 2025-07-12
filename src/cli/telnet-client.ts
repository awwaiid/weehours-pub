import { Telnet } from 'telnet-client';
import * as readline from 'readline';
import { Database } from '../database/database';

export interface MudConnection {
  host: string;
  port: number;
  username: string;
  password: string;
}

export class MudTelnetClient {
  private connection: Telnet;
  private rl: readline.Interface;
  private isConnected = false;
  private database: Database;
  private sessionId = 1;

  constructor(private config: MudConnection) {
    this.connection = new Telnet();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.database = new Database();
  }

  async connect(): Promise<void> {
    try {
      console.log('Initializing database...');
      await this.database.initialize();
      
      console.log(`[DEBUG] Connecting to ${this.config.host}:${this.config.port}...`);
      
      // Set up event handlers BEFORE connecting
      this.setupEventHandlers();
      
      await this.connection.connect({
        host: this.config.host,
        port: this.config.port,
        timeout: 15000,
        echoLines: false,
        stripShellPrompt: false,
        debug: true
      });

      this.isConnected = true;
      console.log('[DEBUG] Connected! Waiting before login...');

      await this.login();
      this.startInputLoop();

    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  private async login(): Promise<void> {
    await this.sleep(1000);
    
    console.log('[DEBUG LOGIN] Sending username:', JSON.stringify(this.config.username));
    await this.connection.send(this.config.username);
    
    await this.sleep(500);
    
    console.log('[DEBUG LOGIN] Sending password:', JSON.stringify(this.config.password));
    await this.connection.send(this.config.password);
    
    console.log('Login credentials sent.');
  }

  private setupEventHandlers(): void {
    console.log('[DEBUG] Setting up event handlers...');
    
    this.connection.on('connect', () => {
      console.log('[DEBUG] Telnet connect event fired!');
    });
    
    this.connection.on('ready', () => {
      console.log('[DEBUG] Telnet ready event fired!');
    });
    
    this.connection.on('data', async (data: Buffer) => {
      console.log('[DEBUG] Data event fired!');
      const text = data.toString();
      
      // Debug output - show raw telnet data
      console.log('\n[DEBUG INCOMING]:', JSON.stringify(text));
      console.log('[DEBUG HEX]:', data.toString('hex'));
      console.log('[DEBUG LENGTH]:', data.length, 'bytes');
      console.log('--- END DEBUG ---');
      
      process.stdout.write(text);
      
      await this.database.logMessage({
        user_session_id: 'cli-session',
        direction: 'incoming',
        content: text
      });
    });

    this.connection.on('close', () => {
      console.log('\n[DEBUG] Connection closed event fired.');
      this.isConnected = false;
      this.rl.close();
      process.exit(0);
    });

    this.connection.on('error', (error: Error) => {
      console.error('[DEBUG] Connection error event fired:', error);
      this.disconnect();
    });
    
    this.connection.on('timeout', () => {
      console.log('[DEBUG] Timeout event fired!');
    });
    
    this.connection.on('failedlogin', () => {
      console.log('[DEBUG] Failed login event fired!');
    });
    
    console.log('[DEBUG] Event handlers set up complete.');
  }

  private startInputLoop(): void {
    this.rl.on('line', async (input: string) => {
      if (this.isConnected) {
        try {
          // Debug output - show outgoing commands
          console.log('\n[DEBUG OUTGOING]:', JSON.stringify(input));
          console.log('[DEBUG OUTGOING HEX]:', Buffer.from(input).toString('hex'));
          console.log('--- END DEBUG ---');
          
          await this.connection.send(input);
          
          await this.database.logMessage({
            user_session_id: 'cli-session',
            direction: 'outgoing',
            content: input
          });
        } catch (error) {
          console.error('Error sending command:', error);
        }
      }
    });

    this.rl.on('SIGINT', () => {
      console.log('\nDisconnecting...');
      this.disconnect();
    });
  }

  private async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.connection.destroy();
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