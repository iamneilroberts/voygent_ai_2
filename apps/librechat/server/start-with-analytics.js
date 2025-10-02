/**
 * LibreChat Startup Wrapper with Analytics
 *
 * This script wraps the LibreChat startup to inject analytics middleware
 * before the server starts accepting requests.
 */

const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Starting LibreChat with analytics...');

// Set analytics environment variables
process.env.ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED || 'false';
process.env.ANALYTICS_TRACKER_URL = process.env.ANALYTICS_TRACKER_URL || '';

if (process.env.ANALYTICS_ENABLED === 'true') {
  console.log('📊 Analytics enabled');
  console.log(`📈 Tracker URL: ${process.env.ANALYTICS_TRACKER_URL}`);

  // Try to inject analytics by requiring the module
  try {
    // This will patch the Express app when LibreChat's server.js loads
    require('./inject-analytics');
  } catch (error) {
    console.error('⚠️  Failed to load analytics injection:', error.message);
    console.log('📊 Continuing without analytics...');
  }
} else {
  console.log('📊 Analytics disabled');
}

// Start the original LibreChat backend
console.log('Starting LibreChat backend...');

const backend = spawn('npm', ['run', 'backend'], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

backend.on('error', (error) => {
  console.error('Failed to start LibreChat:', error);
  process.exit(1);
});

backend.on('exit', (code) => {
  console.log(`LibreChat exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  backend.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  backend.kill('SIGINT');
});
