# WeeHours MUD Client

A modern TypeScript-based MUD client for weehours.net with web interface capabilities.

## Phase 1: CLI Client (COMPLETED)

The CLI client provides basic telnet connection to the MUD with database logging.

### Features

- ✅ Telnet connection to weehours.net:2000
- ✅ Auto-login with credentials
- ✅ Real-time console output
- ✅ User input handling
- ✅ SQLite database logging
- ✅ ANSI code stripping for storage

### Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the CLI client
npm run dev
```

### Database Schema

The SQLite database includes tables for:
- `sessions` - Session configurations (prepared for multi-session support)
- `raw_messages` - All incoming/outgoing telnet data with timestamps
- `parsed_events` - Structured events (future phase)
- `chat_messages` - Chat-specific data (future phase)

## Development

```bash
# Development mode with TypeScript compilation
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
npm run lint:fix
```

## Next Phases

- **Phase 2**: Message parsing and JSON events
- **Phase 2.5**: Multi-session support
- **Phase 3**: Web interface with React/Next.js