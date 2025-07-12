#!/usr/bin/env node

import { Database } from './database/database';

async function queryEvents() {
  const db = new Database();
  
  try {
    await db.initialize();
    
    const args = process.argv.slice(2);
    const command = args[0] || 'recent';
    
    switch (command) {
      case 'recent':
        await showRecentEvents(db, parseInt(args[1]) || 10);
        break;
      case 'chat':
        await showChatMessages(db);
        break;
      case 'types':
        await showEventTypes(db);
        break;
      case 'commands':
        await showUserCommands(db);
        break;
      default:
        console.log('Usage: npx ts-node query-events.ts [recent|chat|types|commands] [limit]');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.close();
  }
}

async function showRecentEvents(db: Database, limit: number) {
  console.log(`\n=== Recent ${limit} Parsed Events ===`);
  const events = await db.allAsync(
    'SELECT event_type, data, timestamp FROM parsed_events ORDER BY timestamp DESC LIMIT ?', 
    [limit]
  );
  
  for (const event of events as Array<{ event_type: string; data: string; timestamp: string }>) {
    const data = JSON.parse(event.data);
    console.log(`[${event.timestamp}] ${event.event_type}:`);
    
    if (event.event_type === 'chat_message') {
      console.log(`  ${data.speaker}: "${data.message}"`);
    } else if (event.event_type === 'user_command') {
      console.log(`  Command: ${data.command}`);
    } else if (event.event_type === 'room_description') {
      console.log(`  Room: ${data.description?.substring(0, 50)}...`);
      console.log(`  Exits: ${data.exits?.join(', ')}`);
    } else {
      console.log(`  ${JSON.stringify(data).substring(0, 100)}...`);
    }
    console.log('');
  }
}

async function showChatMessages(db: Database) {
  console.log('\n=== Chat Messages ===');
  const chats = await db.allAsync(
    'SELECT data, timestamp FROM parsed_events WHERE event_type = ? ORDER BY timestamp DESC LIMIT 20',
    ['chat_message']
  );
  
  for (const chat of chats as Array<{ data: string; timestamp: string }>) {
    const data = JSON.parse(chat.data);
    const time = new Date(chat.timestamp).toLocaleTimeString();
    console.log(`[${time}] ${data.speaker} (${data.chat_type}): ${data.message}`);
  }
}

async function showEventTypes(db: Database) {
  console.log('\n=== Event Type Counts ===');
  const types = await db.allAsync(
    'SELECT event_type, COUNT(*) as count FROM parsed_events GROUP BY event_type ORDER BY count DESC'
  );
  
  for (const type of types as Array<{ event_type: string; count: number }>) {
    console.log(`${type.event_type}: ${type.count}`);
  }
}

async function showUserCommands(db: Database) {
  console.log('\n=== User Commands ===');
  const commands = await db.allAsync(
    'SELECT data, timestamp FROM parsed_events WHERE event_type = ? ORDER BY timestamp DESC LIMIT 20',
    ['user_command']
  );
  
  for (const cmd of commands as Array<{ data: string; timestamp: string }>) {
    const data = JSON.parse(cmd.data);
    const time = new Date(cmd.timestamp).toLocaleTimeString();
    console.log(`[${time}] ${data.player}: ${data.command}`);
  }
}

if (require.main === module) {
  queryEvents().catch(console.error);
}