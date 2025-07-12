# WeeHours MUD Client - Development Context

## Project Overview
A modern TypeScript-based MUD client for zeehours.net with real-time message parsing and web interface capabilities. The project captures telnet MUD sessions, parses them into structured JSON events, and will provide a mobile-friendly web interface for chat-focused interaction.

## Current Status: Phase 3 Complete ✅
**Single-Service Web Application** - Unified Express server serving both API and Next.js frontend with multi-user MUD connections

## Project Structure
```
zeehours-pub/
├── src/
│   ├── cli/                    # Phase 1: CLI client (COMPLETE)
│   │   ├── index.ts           # Main entry point for CLI
│   │   ├── raw-telnet-client.ts # Raw socket telnet client with real-time parsing
│   │   └── telnet-client.ts   # Original telnet-client library attempt (backup)
│   ├── parser/                # Phase 2: Message parsing (COMPLETE)
│   │   └── message-parser.ts  # Converts raw MUD text to structured JSON events
│   ├── database/              # Database layer (COMPLETE)
│   │   ├── database.ts        # SQLite operations and logging
│   │   └── schema.ts          # Database table definitions
│   ├── sessions/              # Multi-user session management (COMPLETE)
│   │   ├── user-session-manager.ts # Web user session handling and coordination
│   │   └── user-mud-connection.ts  # Individual user MUD connections
│   ├── server/                # Phase 3: Web server (COMPLETE)
│   │   ├── index.ts             # Web server entry point
│   │   └── web-server.ts        # Express + Next.js integration with WebSocket
│   └── query-events.ts        # CLI tool for querying parsed events
├── src/web/                   # Phase 3: Next.js frontend (COMPLETE)
│   ├── app/                     # Next.js app directory (layout, pages)
│   ├── components/              # React components (AuthForm, Dashboard, etc.)
│   └── styles/                  # Tailwind CSS and global styles
├── package.json               # All dependencies (backend + frontend)
├── tsconfig.json              # Main TypeScript config with JSX support
├── tsconfig.server.json       # Server-only TypeScript build config
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── .eslintrc.js              # ESLint v8 config
├── .gitignore                # Includes Next.js specific ignores
├── README-WEBAPP.md          # Web app usage instructions
└── CLAUDE.md                 # This development context file
```

## Technology Stack
- **Backend**: Node.js, TypeScript, raw TCP sockets, SQLite3
- **Frontend** (planned): Next.js, React, TypeScript, Tailwind CSS
- **Database**: SQLite with session-aware tables
- **Real-time**: WebSocket for live updates (planned)
- **Development**: CommonJS modules, ESLint v8, ts-node

## Database Schema
```sql
-- Multi-user architecture - each user gets their own MUD connection
user_sessions: id, user_id, username, password, created_at, last_activity, expires_at, active, mud_connected, connection_status
raw_messages: id, user_session_id, direction, content, content_stripped, timestamp
parsed_events: id, user_session_id, event_type, data, timestamp
chat_messages: id, user_session_id, speaker, message, chat_type, timestamp
```

## Key Development Commands
```bash
# Web Application (Single Service)
npm run web          # Start integrated web server (port 3000)
npm run build        # Build server components
npm run web:build    # Build and start production server
npm run lint         # ESLint check

# CLI & Database
npm run dev          # Start CLI client with real-time parsing
npm run query types  # Show parsed event distribution
npm run query chat   # Show chat messages
npm run query recent 5  # Show recent events

# Production Usage
# 1. Start web server: npm run web (port 3000)
# 2. Visit: http://localhost:3000
# Single service serves both API and web interface!
```

## Completed Phases

### Phase 1: CLI Foundation ✅
- Raw TCP socket telnet client (bypassed telnet-client library issues)
- Auto-login with hardcoded credentials
- Real-time console output with debug logging
- SQLite database initialization and raw message logging
- Basic ANSI code handling and telnet protocol filtering

### Phase 2: Message Parsing & JSON Events ✅
- **Real-time parser integration** - Parses messages as they arrive
- **Structured event types**: 
  - `chat_message`: Player speech (You say/others say/tells)
  - `room_description`: Location details with exits/NPCs/objects
  - `player_list`: WHO command results with idle times
  - `system_response`: Syntax errors, settings changes, help responses
  - `player_action`: Simple actions like "You hop up and down"
  - `help_text`: Formatted help screens and command listings
  - `welcome_screen`: ASCII art login screens
  - `user_command`: Player input commands
  - `url_submission`: URL addition confirmations
- **Live event storage** - Events stored to `parsed_events` table in real-time
- **Query tools** - CLI utilities for examining parsed data

## Current Event Distribution (from logged data)
- unknown: 15 (patterns to refine)
- system_response: 12 (syntax errors, settings)
- help_text: 4 (formatted help screens)
- room_description: 3 (pub room details)
- chat_message: 2 (player speech)
- player_list: 2 (WHO command results)
- player_action: 2 (simple actions)
- url_submission: 1 (successful URL add)

## Upcoming Phases

### Phase 2.5: Multi-User Architecture ✅
**Goal**: Support multiple users, each with their own MUD connection and isolated data

**Completed Features**:
- **User Session Management** - Full lifecycle with secure session IDs and MUD credentials
- **Individual MUD Connections** - Each user gets their own telnet connection to zeehours.net
- **Data Isolation** - All messages and events stored per user session ID
- **Connection Management** - Auto-login, state tracking, and graceful disconnection
- **Database Schema** - Complete user session isolation with foreign key relationships
- **Session Coordination** - UserSessionManager orchestrates multiple user connections
- **MUD Credential Storage** - Secure storage of username/password per user session

### Phase 3: Web Interface ✅
**Goal**: Create mobile-friendly web interface with multi-user support

**Completed Features**:
- **Integrated Single Service** - Express.js serves both API and Next.js frontend on one port
- **User Registration/Login** - Secure authentication with MUD credential storage
- **WebSocket Communication** - Real-time message streaming per user session
- **Next.js Frontend** - Modern React app with TypeScript and Tailwind CSS
- **Responsive Design** - Mobile-friendly interface with MUD terminal aesthetics
- **User Dashboard** - Personal MUD session view with connection management
- **Real-Time Terminal** - Live message display with basic ANSI color support
- **Command Interface** - Full command input with history and tab completion
- **Connection Management** - Connect/disconnect controls with status indicators
- **Session Isolation** - Each user sees only their own MUD messages and data
- **Simplified Deployment** - Single service architecture for easy hosting

## Key Files to Understand

### `src/cli/raw-telnet-client.ts`
- Main telnet client implementation using raw TCP sockets
- Handles connection, auto-login, and real-time message processing
- Integrates parser to convert raw messages to events in real-time
- Logs both raw messages and parsed events to database

### `src/parser/message-parser.ts`
- Core message parsing logic
- Pattern matching for different MUD message types
- Converts raw telnet text to structured JSON events
- Extensible architecture for adding new message patterns

### `src/database/database.ts`
- SQLite database operations
- Methods for logging raw messages and parsed events
- Session-aware schema ready for multi-session support

## Development Notes

### Module System
- Using CommonJS for development (better ts-node compatibility)
- ESLint v8 with TypeScript support
- 150 character line limit, semicolons required, single quotes preferred

### MUD Connection Details
- Server responds with ASCII art welcome screen
- Uses telnet negotiation (IAC sequences filtered out)
- Login sequence: "What is your name:" → username → "Password:" → password
- Command prompt is ">" after successful login
- All interactions logged to database with timestamps

### Parser Patterns
- **Chat detection**: `/You say in \w+:/`, `/\w+ says in \w+:/`, tells
- **Room descriptions**: Contains "You are in" + "obvious exits:"
- **Player lists**: Contains "WeeHours LP ::" header format
- **System responses**: "Syntax:", "What?", "Sorry, no such help topic"
- **Help text**: Contains "Commands :" or dashed lines
- **Actions**: Start with "You " but not "You say" or "You are"

## Testing Data Available
- 82 raw messages logged from interactive session
- 43 parsed events generated from test data
- Includes login sequence, room descriptions, help commands, player actions
- Chat messages: "hmm" and longer explanation about the project
- Ready for testing with live chat when friends join

## Project Complete! 🎉

**The WeeHours MUD Web Client is now fully functional with:**
- **Single-Service Architecture**: Express server serves both API and Next.js frontend on one port
- **Multi-user support**: Each user gets their own MUD connection with isolated data
- **Real-time web interface**: WebSocket communication for live message streaming
- **Secure authentication**: User registration/login with MUD credentials
- **Mobile-responsive design**: Tailwind CSS optimized for chat interaction
- **Complete message parsing**: Real-time parsing and SQLite database storage
- **Rich user interface**: Command history, tab completion, status indicators, and quick commands

## Next Possible Enhancements
1. **Advanced ANSI Rendering** - Full color and formatting support
2. **User Profile Management** - In-app credential changing
3. **Chat Rooms** - Multiple character support per user
4. **Mobile App** - React Native version
5. **Game Features** - Maps, inventories, character sheets

## Important Considerations
- **Single Service**: Web interface and API served from same Express server (port 3000)
- **Real-time Parsing**: All MUD messages parsed live during user sessions
- **Data Isolation**: Each user's messages/events stored separately by user_session_id
- **Extensible Parser**: Easy to add new message type patterns and event types
- **WebSocket Communication**: Real-time message streaming per user session
- **Session Management**: Secure session handling with automatic cleanup
- **Development Ready**: TypeScript, ESLint, and hot-reload for development
- **Production Ready**: Build process creates optimized static assets