#!/usr/bin/env node

// Simple integration test for s-md-visible
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

console.log('Starting integration test...\n');

// Create a test markdown file
const testMd = `# Integration Test
This is a test markdown file.

## Features
- Feature 1
- Feature 2
`;

const testFilePath = path.join(os.tmpdir(), 'test-integration.md');
fs.writeFileSync(testFilePath, testMd);
console.log('✓ Created test markdown file');

// Start the server
const serverProcess = spawn('node', [
  'bin/s-md-visible.js',
  '--file', testFilePath,
  '--checkUrl', 'http://httpbin.org/status/200',
  '--port', '9999'
]);

let serverOutput = '';
serverProcess.stdout.on('data', (data) => {
  serverOutput += data.toString();
});

serverProcess.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// Function to check if server is ready
function checkServerReady(retries = 10, delay = 500) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http.get('http://localhost:9999/', (res) => {
        resolve();
      }).on('error', (err) => {
        if (retries > 0) {
          retries--;
          setTimeout(attempt, delay);
        } else {
          reject(new Error('Server failed to start'));
        }
      });
    };
    attempt();
  });
}

// Wait for server to start with retry mechanism
checkServerReady().then(() => {
  console.log('✓ Server started');
  
  // Test the endpoint
  http.get('http://localhost:9999/', (res) => {
    let html = '';
    res.on('data', (chunk) => {
      html += chunk;
    });
    
    res.on('end', () => {
      console.log('✓ Received HTML response');
      
      // Verify key elements
      const checks = [
        { test: html.includes('<h1>Integration Test</h1>'), desc: 'Markdown is parsed' },
        { test: html.includes('http://httpbin.org/status/200'), desc: 'Check URL is present' },
        { test: html.includes('setInterval(checkVisibility, 1000)'), desc: '1-second interval check' },
        { test: html.includes('Stateful Markdown Viewer'), desc: 'Page title is present' },
      ];
      
      let allPassed = true;
      checks.forEach(check => {
        if (check.test) {
          console.log(`✓ ${check.desc}`);
        } else {
          console.log(`✗ ${check.desc}`);
          allPassed = false;
        }
      });
      
      // Cleanup
      serverProcess.kill();
      fs.unlinkSync(testFilePath);
      
      if (allPassed) {
        console.log('\n✓ All tests passed!');
        process.exit(0);
      } else {
        console.log('\n✗ Some tests failed!');
        process.exit(1);
      }
    });
  }).on('error', (err) => {
    console.error('HTTP request error:', err);
    serverProcess.kill();
    process.exit(1);
  });
}).catch((err) => {
  console.error('Server startup error:', err.message);
  serverProcess.kill();
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', () => {
  serverProcess.kill();
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
  process.exit(1);
});
