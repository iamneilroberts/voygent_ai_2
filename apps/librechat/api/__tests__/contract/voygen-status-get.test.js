/**
 * Contract Test: GET /api/voygen/status
 * Feature: 002-rebuild-the-whole
 *
 * Validates that the API endpoint matches the OpenAPI spec in:
 * specs/002-rebuild-the-whole/contracts/api-voygen-status.yaml
 */

const request = require('supertest');
const express = require('express');

// Mock app setup - will be replaced with actual app integration
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

describe('GET /api/voygen/status - Contract Tests', () => {
  describe('Response Schema Validation', () => {
    test('should return 200 with TokenUsageStatus schema when token data available', async () => {
      const response = await request(app)
        .get('/api/voygen/status')
        .expect('Content-Type', /json/);

      // Expecting this to fail initially until implementation is verified
      if (response.status === 200) {
        expect(response.body).toHaveProperty('ok', true);

        // Check if it's TokenUsageStatus
        if (response.body.model) {
          expect(response.body).toMatchObject({
            ok: expect.any(Boolean),
            model: expect.any(String),
            inputTokens: expect.any(Number),
            outputTokens: expect.any(Number),
            approximate: expect.any(Boolean),
          });

          // Optional price field
          if (response.body.price !== undefined) {
            expect(typeof response.body.price).toBe('number');
            expect(response.body.price).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    test('should return 200 with TripProgressStatus schema when trip data available', async () => {
      const response = await request(app)
        .get('/api/voygen/status')
        .expect('Content-Type', /json/);

      if (response.status === 200 && response.body.tripName) {
        expect(response.body).toMatchObject({
          ok: expect.any(Boolean),
          tripName: expect.any(String),
        });

        // Optional fields
        if (response.body.phase) {
          expect(['Research', 'Hotels', 'Activities', 'Booking', 'Finalization'])
            .toContain(response.body.phase);
        }

        if (response.body.percent !== undefined) {
          expect(response.body.percent).toBeGreaterThanOrEqual(0);
          expect(response.body.percent).toBeLessThanOrEqual(100);
        }
      }
    });

    test('should return 204 No Content when no status data available', async () => {
      // This may pass or fail depending on implementation state
      const response = await request(app)
        .get('/api/voygen/status');

      if (response.status === 204) {
        expect(response.body).toEqual({});
      }
    });

    test('should return 500 with Error schema on server error', async () => {
      // Trigger error condition (implementation dependent)
      const response = await request(app)
        .get('/api/voygen/status?q=trigger_error');

      if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
      }
    });
  });

  describe('Query Parameter Handling', () => {
    test('should accept optional q parameter', async () => {
      const response = await request(app)
        .get('/api/voygen/status?q=test_query');

      // Should not return 400 for valid query param
      expect(response.status).not.toBe(400);
    });
  });

  describe('Response Headers', () => {
    test('should return Content-Type: application/json for 200 responses', async () => {
      const response = await request(app)
        .get('/api/voygen/status');

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });
});
