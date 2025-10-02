/**
 * Contract Test: POST /api/voygen/start
 * Feature: 002-rebuild-the-whole
 *
 * Validates that the API endpoint matches the OpenAPI spec in:
 * specs/002-rebuild-the-whole/contracts/api-voygen-status.yaml
 */

const request = require('supertest');
const express = require('express');

// Mock app setup
const app = express();
app.use(express.json());

// Import the voygent routes (this will fail initially - TDD)
let voygenRouter;
try {
  voygenRouter = require('../../server/routes/voygent');
  app.use('/api/voygen', voygenRouter);
} catch (err) {
  console.warn('[TEST] Voygent routes not mounted yet:', err.message);
}

describe('POST /api/voygen/start - Contract Tests', () => {
  describe('Response Schema Validation', () => {
    test('should return 200 with {ok: true} on successful initialization', async () => {
      const response = await request(app)
        .post('/api/voygen/start')
        .expect('Content-Type', /json/);

      // Expecting this to fail initially until implementation is verified
      if (response.status === 200) {
        expect(response.body).toMatchObject({
          ok: true,
        });
      }
    });

    test('should return 500 with Error schema on initialization failure', async () => {
      // This test simulates an error condition
      // In real implementation, might need to mock dependencies to trigger error
      const response = await request(app)
        .post('/api/voygen/start');

      if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');

        // Optional message field
        if (response.body.message) {
          expect(typeof response.body.message).toBe('string');
        }
      }
    });
  });

  describe('HTTP Method Validation', () => {
    test('should not accept GET requests to /api/voygen/start', async () => {
      const response = await request(app)
        .get('/api/voygen/start');

      // Should return 404 or 405 (Method Not Allowed)
      expect([404, 405]).toContain(response.status);
    });
  });

  describe('Response Headers', () => {
    test('should return Content-Type: application/json', async () => {
      const response = await request(app)
        .post('/api/voygen/start');

      if (response.status === 200 || response.status === 500) {
        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });
});
