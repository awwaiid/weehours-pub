#!/usr/bin/env node

import { RawMudTelnetClient, MudConnection } from './raw-telnet-client';

async function main() {
  const config: MudConnection = {
    host: 'weehours.net',
    port: 2000,
    username: 'awwaiid',
    password: '***REMOVED***'
  };

  console.log('WeeHours MUD Client v1.0.0');
  console.log('============================');

  const client = new RawMudTelnetClient(config);

  try {
    await client.connect();
  } catch (error) {
    console.error('Failed to start client:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}