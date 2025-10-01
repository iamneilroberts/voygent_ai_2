/**
 * D1 Travel Database MCP Server - Modular Version
 * Significantly reduced file size through modularization
 */

import { McpAgent } from "./agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Env } from './types';
import { DatabaseManager } from './database/manager';
import { registerClientTools } from './tools/clients';
import { registerTripTools } from './tools/trips';
import { registerUtilityTools } from './tools/utilities';
import { registerInstructionTools } from './tools/instructions';
import { registerPreferenceTools } from './tools/preferences';

// All tools are now fully modularized - no more dependencies on original index.ts

/**
 * Enhanced D1 Travel Database MCP agent - Modular Architecture
 * ~200 lines instead of 1700+ lines
 */
export class D1TravelMCP extends McpAgent {
	server = new McpServer({
		name: "D1 Travel Database (Enhanced)",
		version: "4.1.0",
	});

	private dbManager: DatabaseManager | null = null;

	/**
	 * Get environment with proper typing
	 */
	private getEnv(): Env {
		return this.env as Env;
	}

	/**
	 * Initialize database manager
	 */
	private getDbManager(): DatabaseManager {
		if (!this.dbManager) {
			this.dbManager = new DatabaseManager(this.getEnv());
		}
		return this.dbManager;
	}

	async init() {
		// Register modular tools
		registerClientTools(this.server, () => this.getEnv());
		registerTripTools(this.server, () => this.getEnv());
		registerUtilityTools(this.server, () => this.getEnv());
		registerInstructionTools(this.server, () => this.getEnv());
		registerPreferenceTools(this.server, () => this.getEnv());

		// All tools are now fully modularized!
		// Legacy travel search tools have been removed as requested
		
		// Add a simple health check
		this.server.tool(
			"health_check",
			{},
			async () => {
				const dbManager = this.getDbManager();
				const initialized = await dbManager.ensureInitialized();
				
				return {
					content: [{
						type: "text",
						text: `Database Status: ${initialized ? '✅ Healthy' : '❌ Not Initialized'}\nVersion: 4.1.0 (Fully Modular)\nAll tools modularized, legacy travel search tools removed`
					}]
				};
			}
		);
	}
}

// Cloudflare Worker export
export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// Standard MCP HTTP endpoints
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return D1TravelMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return D1TravelMCP.serve("/mcp").fetch(request, env, ctx);
		}

		// Health check endpoint
		if (url.pathname === "/health") {
			return new Response(JSON.stringify({
				status: "healthy",
				service: "D1 Travel Database MCP v4.1 (Modular)",
				features: [
					"modular-architecture",
					"travel-tools", 
					"error-logging", 
					"recent-activity", 
					"auto-initialization"
				],
				modules: {
					database: ["schema", "manager", "errors"],
					tools: ["clients", "trips", "instructions", "preferences", "utilities"]
				},
				timestamp: new Date().toISOString()
			}), {
				headers: { "Content-Type": "application/json" }
			});
		}

		return new Response(JSON.stringify({
			error: "Not found",
			available_endpoints: ["/sse", "/mcp", "/health"],
			version: "4.1.0"
		}), {
			status: 404,
			headers: { "Content-Type": "application/json" }
		});
	},
};