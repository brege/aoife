import { WebSocket } from 'ws';

let mockClient = null;

async function setupMockClient() {
  return new Promise((resolve, reject) => {
    try {
      mockClient = new WebSocket('ws://localhost:8080');

      mockClient.on('open', () => {
        console.log('[test] Mock WebSocket client connected');
        resolve();
      });

      mockClient.on('error', (err) => {
        console.error('[test] Mock WebSocket error:', err.message);
        reject(err);
      });

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      mockClient.once('open', () => clearTimeout(timeout));
    } catch (err) {
      reject(err);
    }
  });
}

function cleanupMockClient() {
  if (mockClient) {
    mockClient.close();
    mockClient = null;
  }
}

describe('Setup', function () {
  this.timeout(60000);

  before(async () => {
    try {
      await setupMockClient();
      console.log('[test] Mock client ready for API calls');
    } catch (err) {
      console.error('[test] Failed to setup mock client:', err.message);
      throw err;
    }
  });

  after(() => {
    cleanupMockClient();
    console.log('[test] Cleanup complete');
  });

  it('mock client is ready', () => {
    // Dummy test to keep Mocha happy
  });
});

// Ensure cleanup on process exit
process.on('exit', () => {
  cleanupMockClient();
});

process.on('SIGINT', () => {
  cleanupMockClient();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanupMockClient();
  process.exit(0);
});
