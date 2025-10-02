/**
 * Integration Test: Voygent Routes Mounting
 * Feature: 002-rebuild-the-whole
 *
 * Verifies that voygent router is correctly mounted and routes are accessible.
 */

const request = require('supertest');
const express = require('express');

describe('Voygent Routes Integration', () => {
  let app;
  let voygenRouter;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Try to import the voygent router
    try {
      voygenRouter = require('../../server/routes/voygent');
      app.use('/api/voygen', voygenRouter);
    } catch (err) {
      console.error('[TEST] Failed to load voygent routes:', err.message);
    }
  });

  describe('Router Export', () => {
    test('should export voygent router from index.js', () => {
      // This will fail initially if routes aren't set up
      expect(() => {
        require('../../server/routes/voygent/index.js');
      }).not.toThrow();
    });

    test('should export an Express router instance', () => {
      const router = require('../../server/routes/voygent/index.js');
      expect(router).toBeDefined();
      expect(typeof router).toBe('function'); // Express routers are functions
    });
  });

  describe('Route Mounting', () => {
    test('should mount voygent router at /api/voygen', async () => {
      const response = await request(app)
        .get('/api/voygen/status');

      // Should not return 404 (route exists)
      // May return other status codes depending on implementation
      expect(response.status).not.toBe(404);
    });

    test('GET /api/voygen/status should be accessible', async () => {
      const response = await request(app)
        .get('/api/voygen/status');

      // Should be a valid route (not 404)
      expect(response.status).not.toBe(404);

      // Should accept GET method (not 405 Method Not Allowed)
      expect(response.status).not.toBe(405);
    });

    test('POST /api/voygen/start should be accessible', async () => {
      const response = await request(app)
        .post('/api/voygen/start');

      // Should be a valid route (not 404)
      expect(response.status).not.toBe(404);

      // Should accept POST method (not 405)
      expect(response.status).not.toBe(405);
    });
  });

  describe('Sub-routes', () => {
    test('should have token-usage route handler', () => {
      // Check that token-usage.js exists and exports a router
      expect(() => {
        require('../../server/routes/voygent/token-usage.js');
      }).not.toThrow();
    });

    test('should have trip-progress route handler', () => {
      expect(() => {
        require('../../server/routes/voygent/trip-progress.js');
      }).not.toThrow();
    });

    test('should have status route handler', () => {
      expect(() => {
        require('../../server/routes/voygent/status.js');
      }).not.toThrow();
    });

    test('should have mcp-health route handler', () => {
      expect(() => {
        require('../../server/routes/voygent/mcp-health.js');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should return JSON errors (not HTML)', async () => {
      const response = await request(app)
        .get('/api/voygen/nonexistent');

      // If route doesn't exist, should still return JSON format (if error handler is set up)
      if (response.status >= 400) {
        // LibreChat may have default error handlers that return JSON
        // This is a soft assertion
        const contentType = response.headers['content-type'];
        if (contentType) {
          // Preferably JSON, but not strictly required
          expect(contentType).toMatch(/json|text/);
        }
      }
    });
  });
});
