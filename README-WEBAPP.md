# WeeHours MUD Web Client

A modern web-based client for zeehours.net MUD with multi-user support.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Web Server
```bash
npm run web
```
Server will start on http://localhost:3000

### 3. Access the Web Client
Open your browser to: **http://localhost:3000**

That's it! The web interface and API are served from the same port.

## Features

- **Multi-User Support**: Each user gets their own MUD connection
- **Real-Time Interface**: WebSocket communication for live updates
- **Secure Authentication**: User registration with MUD credentials
- **Mobile-Responsive**: Optimized for both desktop and mobile
- **Command History**: Arrow keys to navigate previous commands
- **Tab Completion**: Auto-complete common MUD commands
- **Status Indicators**: Connection state and login progress
- **Message Parsing**: Structured parsing of MUD output

## Usage

1. **Register**: Create an account with your WeeHours MUD username/password
2. **Login**: Use your session ID to login on any device
3. **Connect**: Click "Connect to MUD" to establish your telnet connection
4. **Play**: Use the terminal interface just like a traditional MUD client

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/mud/connect` - Connect to MUD
- `POST /api/mud/disconnect` - Disconnect from MUD
- `POST /api/mud/command` - Send command to MUD
- `GET /api/mud/messages` - Get message history

## Technology Stack

- **Backend**: Express.js, WebSocket, SQLite
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Database**: SQLite with user session isolation
- **Real-time**: WebSocket for message streaming

## Development

```bash
# Web development
npm run web          # Start dev server (port 3000)
npm run build        # Build server components
npm run web:build    # Build and start production server
npm run lint         # Check code quality

# Database queries
npm run query chat   # View chat messages
npm run query types  # View event types

# CLI client (original)
npm run dev          # Start CLI MUD client
```

Enjoy your WeeHours MUD experience! 🎮