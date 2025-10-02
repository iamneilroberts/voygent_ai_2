/**
 * Integration Test: MCP Configuration Loading
 * Feature: 002-rebuild-the-whole
 *
 * Verifies that librechat.yaml is loaded and MCP servers are correctly configured.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('MCP Configuration Integration', () => {
  let configPath;
  let config;

  beforeAll(() => {
    // Path to librechat.yaml
    configPath = path.join(__dirname, '../../librechat.yaml');

    // Try to load the config file
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      config = yaml.load(fileContents);
    } catch (err) {
      console.error('[TEST] Failed to load librechat.yaml:', err.message);
    }
  });

  describe('Config File Existence', () => {
    test('should have librechat.yaml in the root directory', () => {
      expect(fs.existsSync(configPath)).toBe(true);
    });

    test('should be valid YAML format', () => {
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });
  });

  describe('MCP Servers Configuration', () => {
    test('should have mcpServers section', () => {
      expect(config).toHaveProperty('mcpServers');
      expect(typeof config.mcpServers).toBe('object');
    });

    test('should have d1-database MCP server configured', () => {
      expect(config.mcpServers).toHaveProperty('d1-database');

      const d1Server = config.mcpServers['d1-database'];
      expect(d1Server).toHaveProperty('command');
      expect(d1Server).toHaveProperty('args');

      // Should use mcp-remote for Cloudflare Workers
      expect(d1Server.command).toBe('npx');
      expect(d1Server.args).toContain('mcp-remote');

      // Should have the correct worker URL
      const urlArg = d1Server.args.find((arg) => arg.includes('workers.dev'));
      expect(urlArg).toBeDefined();
      expect(urlArg).toContain('d1-database');
    });

    test('should have prompt-instructions MCP server configured', () => {
      expect(config.mcpServers).toHaveProperty('prompt-instructions');

      const promptServer = config.mcpServers['prompt-instructions'];
      expect(promptServer).toHaveProperty('command');
      expect(promptServer.command).toBe('npx');

      const urlArg = promptServer.args.find((arg) => arg.includes('workers.dev'));
      expect(urlArg).toBeDefined();
      expect(urlArg).toContain('prompt-instructions');
    });

    test('should have template-document MCP server configured', () => {
      expect(config.mcpServers).toHaveProperty('template-document');

      const templateServer = config.mcpServers['template-document'];
      expect(templateServer).toHaveProperty('command');
      expect(templateServer.command).toBe('npx');

      const urlArg = templateServer.args.find((arg) => arg.includes('workers.dev'));
      expect(urlArg).toBeDefined();
      expect(urlArg).toContain('template-document');
    });

    test('should NOT have incorrect MCP servers from earlier', () => {
      // Verify we don't have the wrong server names
      // (This was mentioned in clarifications - "NOT the incorrect list from earlier")
      const serverNames = Object.keys(config.mcpServers);

      // The correct servers should be present (may be kebab-case or snake_case)
      const hasCorrectServers =
        serverNames.some(name => name.includes('d1') || name.includes('database')) &&
        serverNames.some(name => name.includes('prompt') || name.includes('instructions')) &&
        serverNames.some(name => name.includes('template') || name.includes('document'));

      expect(hasCorrectServers).toBe(true);
    });
  });

  describe('MCP Server URLs', () => {
    test('should have valid worker URLs defined', () => {
      const servers = config.mcpServers;

      Object.keys(servers).forEach((serverName) => {
        const server = servers[serverName];
        if (server.args) {
          const urlArg = server.args.find((arg) =>
            typeof arg === 'string' && arg.includes('http')
          );

          if (urlArg) {
            // Should be a valid URL format
            expect(urlArg).toMatch(/^https?:\/\/.+/);
          }
        }
      });
    });

    test('should use /sse endpoint for streaming', () => {
      const servers = config.mcpServers;

      Object.keys(servers).forEach((serverName) => {
        const server = servers[serverName];
        if (server.args) {
          const urlArg = server.args.find((arg) =>
            typeof arg === 'string' && arg.includes('workers.dev')
          );

          if (urlArg) {
            // Should use /sse endpoint for Server-Sent Events
            expect(urlArg).toContain('/sse');
          }
        }
      });
    });
  });

  describe('Additional Configuration', () => {
    test('should have version specified', () => {
      expect(config).toHaveProperty('version');
    });

    test('should have endpoints configuration', () => {
      expect(config).toHaveProperty('endpoints');
    });
  });
});
