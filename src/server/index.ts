#!/usr/bin/env node

import { WebServer } from './web-server';

async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  
  console.log('WeeHours MUD Web Server');
  console.log('=======================');
  console.log(`Starting on port ${port}...`);
  
  const server = new WebServer(port);
  
  try {
    await server.start();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\nShutting down server...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}