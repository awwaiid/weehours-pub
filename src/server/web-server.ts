import express from 'express';
import http from 'http';
import session, { Session } from 'express-session';
import cookieParser from 'cookie-parser';
import next from 'next';
import { UserSessionManager } from '../sessions/user-session-manager';

export interface AuthenticatedUser {
  sessionId: string;
  userId?: string;
  username: string;
}

interface CustomSession extends Session {
  user?: Partial<AuthenticatedUser>;
}

export class WebServer {
  private app: express.Application;
  private server: http.Server;
  private sessionManager: UserSessionManager;
  private port: number;
  private nextApp: any;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.sessionManager = new UserSessionManager();
    
    // Initialize Next.js
    const dev = process.env.NODE_ENV !== 'production';
    this.nextApp = next({ 
      dev, 
      dir: './src/web',
      conf: {
        distDir: '../../.next'
      }
    });
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());

    // Session configuration
    this.app.use(session({
      secret: process.env.SESSION_SECRET || 'weehours-dev-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Unified authentication - connect to existing session or create new one
    this.app.post('/api/auth/connect', async (req, res) => {
      try {
        const { userId, username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        // Try to find existing session by username
        let userSession = await this.sessionManager.getSessionByUsername(username);
        let sessionId: string;
        let isNewSession = false;

        if (userSession) {
          // Existing session found - verify password (plaintext comparison)
          if (password !== userSession.password) {
            return res.status(401).json({ error: 'Invalid password' });
          }
          
          sessionId = userSession.id;
        } else {
          // No existing session - create new one (store plaintext password)
          sessionId = await this.sessionManager.createSession(userId, username, password);
          userSession = await this.sessionManager.getSession(sessionId);
          isNewSession = true;
        }

        // Store session info
        (req.session as CustomSession).user = {
          sessionId,
          userId: userSession?.user_id ?? userId,
          username
        };

        res.json({ 
          success: true, 
          sessionId,
          username,
          message: isNewSession ? 'New session created successfully' : 'Connected to existing session'
        });

      } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
      }
    });

    // User login
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { sessionId, password } = req.body;

        if (!sessionId || !password) {
          return res.status(400).json({ error: 'Session ID and password are required' });
        }

        // Get user session
        const userSession = await this.sessionManager.getSession(sessionId);
        if (!userSession) {
          return res.status(401).json({ error: 'Invalid session' });
        }

        // Verify password
        const passwordMatch = password === userSession.password;
        if (!passwordMatch) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        // Store session info
        (req.session as CustomSession).user = {
          sessionId: userSession.id,
          userId: userSession.user_id,
          username: userSession.username
        };

        res.json({ 
          success: true, 
          sessionId: userSession.id,
          username: userSession.username,
          message: 'Login successful' 
        });

      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Logout
    this.app.post('/api/auth/logout', (req, res) => {
      const user = (req.session as CustomSession).user;
      if (user && user.sessionId) {
        // Disconnect MUD connection
        this.sessionManager.disconnectMud(user.sessionId);
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully' });
      });
    });

    // Get current user info
    this.app.get('/api/auth/user', (req, res) => {
      const user = (req.session as CustomSession).user;
      if (!user || !user.sessionId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      res.json({
        sessionId: user.sessionId,
        userId: user.userId,
        username: user.username
      });
    });

    // MUD connection management
    this.app.post('/api/mud/connect', async (req, res) => {
      const user = (req.session as CustomSession).user;
      if (!user || !user.sessionId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      try {
        // The MUD connection now only logs to the database.
        // The client will poll for updates.
        await this.sessionManager.connectMudForUser(
          user.sessionId,
          () => {}, // onMessage - no longer needed for real-time push
          () => {}  // onStateChange - no longer needed for real-time push
        );

        res.json({ success: true, message: 'Connected to MUD' });
      } catch (error) {
        console.error('MUD connection error:', error);
        
        // If user already has an active connection, treat as success
        if (error instanceof Error && error.message === 'User already has an active MUD connection') {
          res.json({ success: true, message: 'Already connected to MUD' });
        } else {
          res.status(500).json({ error: 'Failed to connect to MUD' });
        }
      }
    });

    // Get MUD connection status
    this.app.get('/api/mud/status', async (req, res) => {
      const user = (req.session as CustomSession).user;
      if (!user || !user.sessionId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      try {
        const status = await this.sessionManager.getConnectionStatus(user.sessionId);
        res.json({ status });
      } catch (error) {
        console.error('Status fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
      }
    });

    this.app.post('/api/mud/disconnect', async (req, res) => {
      const user = (req.session as CustomSession).user;
      if (!user || !user.sessionId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      try {
        await this.sessionManager.disconnectMud(user.sessionId);
        res.json({ success: true, message: 'Disconnected from MUD' });
      } catch (error) {
        console.error('MUD disconnection error:', error);
        res.status(500).json({ error: 'Failed to disconnect from MUD' });
      }
    });

    // Send command to MUD
    this.app.post('/api/mud/command', async (req, res) => {
      const user = (req.session as CustomSession).user;
      if (!user || !user.sessionId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      try {
        const { command } = req.body;
        if (!command) {
          return res.status(400).json({ error: 'Command is required' });
        }

        await this.sessionManager.sendMudCommand(user.sessionId, command);
        res.json({ success: true, message: 'Command sent' });
      } catch (error) {
        console.error('Command send error:', error);
        res.status(500).json({ error: 'Failed to send command' });
      }
    });

    // Get recent messages
    this.app.get('/api/mud/messages', async (req, res) => {
      const user = (req.session as CustomSession).user;
      if (!user || !user.sessionId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      try {
        const limit = parseInt(req.query.limit as string) || 100;
        const messages = await this.sessionManager.getRecentMessages(user.sessionId, limit);
        res.json({ messages });
      } catch (error) {
        console.error('Messages fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
      }
    });

    // Handle Next.js routes (must be last)
    const handle = this.nextApp.getRequestHandler();
    this.app.all('*', (req, res) => {
      return handle(req, res);
    });
  }

  async start(): Promise<void> {
    await this.sessionManager.initialize();
    await this.nextApp.prepare();
    
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`WebServer running on http://localhost:${this.port}`);
        console.log('Next.js app ready');
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Clean up all connections
    await this.sessionManager.close();
    
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('WebServer stopped');
        resolve();
      });
    });
  }
}