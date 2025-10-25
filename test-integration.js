#!/usr/bin/env node

// Simple integration test for s-md-visible
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

console.log('Starting integration test...\n');

// Create a test markdown file
const testMd = `# Integration Test
This is a test markdown file.

## Features
- Feature 1
- Feature 2
`;

fs.writeFileSync('/tmp/test-integration.md', testMd);
console.log('✓ Created test markdown file');

// Start the server
const serverProcess = spawn('node', [
  'bin/s-md-visible.js',
  '--file', '/tmp/test-integration.md',
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

// Wait for server to start
setTimeout(() => {
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
      fs.unlinkSync('/tmp/test-integration.md');
      
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
}, 2000);

// Cleanup on exit
process.on('SIGINT', () => {
  serverProcess.kill();
  if (fs.existsSync('/tmp/test-integration.md')) {
    fs.unlinkSync('/tmp/test-integration.md');
  }
  process.exit(1);
});
