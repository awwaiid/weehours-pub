const net = require('net');

console.log('Testing raw socket connection to zeehours.net:2000...');

const socket = new net.Socket();

socket.on('connect', () => {
  console.log('[RAW] Connected to zeehours.net:2000');
});

socket.on('data', (data) => {
  console.log('[RAW] Received data:', JSON.stringify(data.toString()));
  console.log('[RAW] Hex:', data.toString('hex'));
  console.log('[RAW] Length:', data.length);
});

socket.on('error', (err) => {
  console.log('[RAW] Socket error:', err);
});

socket.on('close', () => {
  console.log('[RAW] Connection closed');
});

socket.connect(2000, 'zeehours.net', () => {
  console.log('[RAW] Socket connected, waiting for data...');
  
  // Send username after a delay
  setTimeout(() => {
    console.log('[RAW] Sending username...');
    socket.write('awwaiid\n');
  }, 2000);
  
  // Send password after another delay
  setTimeout(() => {
    console.log('[RAW] Sending password...');
    socket.write('***REMOVED***\n');
  }, 3000);
});

// Keep the process alive
setTimeout(() => {
  console.log('[RAW] Test timeout, closing...');
  socket.destroy();
  process.exit(0);
}, 10000);