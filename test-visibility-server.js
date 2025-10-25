#!/usr/bin/env node

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// State to track visibility
let isVisible = true;

// Visibility check endpoint - returns JSON with visible boolean
app.get('/api/check-visibility', (req, res) => {
  console.log(`[${new Date().toISOString()}] Visibility check requested - Current state: ${isVisible}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  res.json({
    visible: isVisible,
    timestamp: new Date().toISOString(),
    message: isVisible ? 'Content is visible' : 'Content is hidden'
  });
});

// Toggle visibility endpoint (for testing)
app.post('/api/toggle-visibility', (req, res) => {
  isVisible = !isVisible;
  console.log(`[${new Date().toISOString()}] Visibility toggled to: ${isVisible}`);

  res.json({
    visible: isVisible,
    message: `Visibility ${isVisible ? 'enabled' : 'disabled'}`,
    timestamp: new Date().toISOString()
  });
});

// Set visibility endpoint
app.post('/api/set-visibility', (req, res) => {
  const { visible } = req.body;

  if (typeof visible !== 'boolean') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'visible field must be a boolean'
    });
  }

  isVisible = visible;
  console.log(`[${new Date().toISOString()}] Visibility set to: ${isVisible}`);

  res.json({
    visible: isVisible,
    message: `Visibility set to ${isVisible}`,
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    server: 'Test Visibility Server',
    status: 'running',
    currentVisibility: isVisible,
    timestamp: new Date().toISOString(),
    endpoints: {
      'GET /api/check-visibility': 'Check current visibility status',
      'POST /api/toggle-visibility': 'Toggle visibility on/off',
      'POST /api/set-visibility': 'Set visibility to specific value',
      'GET /status': 'Get server status'
    }
  });
});

// Root endpoint with usage instructions
app.get('/', (req, res) => {
  res.json({
    message: 'Test Visibility Server for Stateful Markdown',
    currentVisibility: isVisible,
    usage: {
      checkVisibility: `GET ${req.protocol}://${req.get('host')}/api/check-visibility`,
      toggleVisibility: `POST ${req.protocol}://${req.get('host')}/api/toggle-visibility`,
      setVisibility: `POST ${req.protocol}://${req.get('host')}/api/set-visibility`,
      status: `GET ${req.protocol}://${req.get('host')}/status`
    },
    example: {
      statefulMdCommand: `npm start s-md-visible --file ./example.md --sharing-name test-doc --checking-url ${req.protocol}://${req.get('host')}/api/check-visibility --port 3000`
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.originalUrl} was not found`,
    availableEndpoints: [
      '/api/check-visibility',
      '/api/toggle-visibility',
      '/api/set-visibility',
      '/status'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Test Visibility Server Started');
  console.log(`📊 Server Details:`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Initial Visibility: ${isVisible}`);
  console.log(`🌐 Endpoints:`);
  console.log(`   Check Visibility: http://localhost:${PORT}/api/check-visibility`);
  console.log(`   Toggle Visibility: POST http://localhost:${PORT}/api/toggle-visibility`);
  console.log(`   Set Visibility: POST http://localhost:${PORT}/api/set-visibility`);
  console.log(`   Status: http://localhost:${PORT}/status`);
  console.log(`\n💡 Example Stateful MD Command:`);
  console.log(`npm start s-md-visible \\`);
  console.log(`  --file ./example.md \\`);
  console.log(`  --sharing-name test-doc \\`);
  console.log(`  --checking-url http://localhost:${PORT}/api/check-visibility \\`);
  console.log(`  --port 3000`);
  console.log(`\n✅ Visibility server is ready!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});
