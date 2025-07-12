export const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    active BOOLEAN DEFAULT TRUE,
    mud_connected BOOLEAN DEFAULT FALSE,
    connection_status TEXT DEFAULT 'disconnected'
  )`,
  
  `CREATE TABLE IF NOT EXISTS raw_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_session_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    content TEXT NOT NULL,
    content_stripped TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_session_id) REFERENCES user_sessions (id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS parsed_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    data TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_session_id) REFERENCES user_sessions (id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_session_id TEXT NOT NULL,
    speaker TEXT,
    message TEXT NOT NULL,
    chat_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_session_id) REFERENCES user_sessions (id)
  )`
];