#!/usr/bin/env node

import { Database } from './src/database/database';
import { MessageParser, ParsedEvent } from './src/parser/message-parser';

async function testParser() {
  console.log('Testing Message Parser on logged data...\n');
  
  const db = new Database();
  const parser = new MessageParser();
  
  try {
    await db.initialize();
    
    // Get all raw messages
    const messages = await db.allAsync(
      'SELECT id, direction, content, timestamp FROM raw_messages WHERE direction = ? ORDER BY id',
      ['incoming']
    );
    
    console.log(`Processing ${messages.length} incoming messages...\n`);
    
    let totalEvents = 0;
    const eventTypeCounts: Record<string, number> = {};
    
    for (const msg of messages) {
      // Skip telnet negotiation and empty messages
      if (msg.content.length < 3 || /^[\x00-\x1F\xFF]+/.test(msg.content)) {
        continue;
      }
      
      const events = parser.parseMessage(msg.id, msg.content, msg.timestamp);
      
      if (events.length > 0) {
        console.log(`--- Message ${msg.id} ---`);
        console.log(`Content: ${JSON.stringify(msg.content.substring(0, 100))}...`);
        
        for (const event of events) {
          console.log(`  Event Type: ${event.event_type}`);
          console.log(`  Data:`, JSON.stringify(event.data, null, 2));
          
          // Store the parsed event in the database
          try {
            await db.logParsedEvent(event);
            console.log(`  ✅ Stored in database`);
          } catch (error) {
            console.log(`  ❌ Failed to store: ${error}`);
          }
          
          eventTypeCounts[event.event_type] = (eventTypeCounts[event.event_type] || 0) + 1;
          totalEvents++;
        }
        console.log('');
      }
    }
    
    console.log('\n=== PARSER SUMMARY ===');
    console.log(`Total Events Generated: ${totalEvents}`);
    console.log('Event Type Breakdown:');
    for (const [type, count] of Object.entries(eventTypeCounts)) {
      console.log(`  ${type}: ${count}`);
    }
    
  } catch (error) {
    console.error('Error testing parser:', error);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  testParser().catch(console.error);
}