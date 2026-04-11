/**
 * Test Admin Login via HTTP Request
 * Simulates the admin panel login button click
 */

const http = require('http');

const API_URL = 'http://localhost:3311';
const LOGIN_ENDPOINT = '/admin/login';

async function testAdminLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 3311,
      path: LOGIN_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`\n[HTTP] Status: ${res.statusCode}`);
        console.log(`[HTTP] Headers:`, res.headers);
        
        try {
          const json = JSON.parse(data);
          console.log(`[HTTP] Response:`, JSON.stringify(json, null, 2));
          
          if (res.statusCode === 200 && json.token) {
            console.log('\n✅ LOGIN TEST PASSED');
            console.log(`Token received: ${json.token.substring(0, 30)}...`);
          } else {
            console.log('\n❌ LOGIN TEST FAILED');
          }
        } catch (e) {
          console.log(`[HTTP] Response (raw):`, data);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Connection error:', error.message);
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && npm start');
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

console.log('\n' + '='.repeat(60));
console.log('ADMIN LOGIN TEST');
console.log('='.repeat(60));
console.log(`\nTesting: POST ${API_URL}${LOGIN_ENDPOINT}`);
console.log('Credentials: admin / admin123\n');

testAdminLogin().catch(error => {
  setTimeout(() => process.exit(1), 100);
});
