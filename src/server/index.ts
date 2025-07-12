#!/usr/bin/env node

import { WebServer } from './web-server';

async function main() {
  console.log(`

--- SERVER RESTARTING AT ${new Date().toISOString()} ---`);
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  
  console.log('WeeHours MUD Web Server');
  console.log('=======================');
  console.log(`Starting on port ${port}...`);
  
  const server = new WebServer(port);
  
  try {
    await server.start();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Received SIGINT (Ctrl-C), shutting down server...');
      
      // Force exit after 10 seconds if graceful shutdown fails
      const forceExitTimeout = setTimeout(() => {
        console.log('⚠️  Forcing exit after 10 seconds...');
        process.exit(0);
      }, 10000);
      
      try {
        await server.stop();
        clearTimeout(forceExitTimeout);
        console.log('✅ Server stopped gracefully');
        process.exit(0);
      } catch (error) {
        clearTimeout(forceExitTimeout);
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n⏹️  Received SIGTERM, shutting down server...');
      
      // Force exit after 10 seconds if graceful shutdown fails
      const forceExitTimeout = setTimeout(() => {
        console.log('⚠️  Forcing exit after 10 seconds...');
        process.exit(0);
      }, 10000);
      
      try {
        await server.stop();
        clearTimeout(forceExitTimeout);
        console.log('✅ Server stopped gracefully');
        process.exit(0);
      } catch (error) {
        clearTimeout(forceExitTimeout);
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}