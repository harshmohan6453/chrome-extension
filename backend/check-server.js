const http = require('http');

http.get('http://localhost:3000', (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', () => {});
  res.on('end', () => console.log('Connectivity Confirmed'));
}).on('error', (e) => {
  console.error('Connection Error:', e.message);
});
