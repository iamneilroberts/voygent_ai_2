/**
 * Instruction management tools for D1 Travel Database
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Env, ToolResponse } from '../types';
import { DatabaseManager } from '../database/manager';
import { ErrorLogger } from '../database/errors';

export function registerInstructionTools(server: McpServer, getEnv: () => Env) {
	// Get instruction by name
	server.tool(
		"get_instruction",
		{
			name: z.string().describe("Instruction name (e.g., 'startup-core', 'mobile-mode')")
		},
		async (params) => {
			const env = getEnv();
			const dbManager = new DatabaseManager(env);
			const errorLogger = new ErrorLogger(env);
			
			const initialized = await dbManager.ensureInitialized();
			if (!initialized) {
				return dbManager.createInitFailedResponse();
			}

			try {
				const instruction = await env.DB.prepare(`
					SELECT * FROM instruction_sets 
					WHERE name = ? AND active = 1
				`).bind(params.name).first();

				if (!instruction) {
					return dbManager.createErrorResponse(`No active instruction found with name: ${params.name}`);
				}

				return {
					content: [{
						type: "text",
						text: `# ${instruction.title}\n\n${instruction.content}\n\n---\n*Category: ${instruction.category} | Version: ${instruction.version}*`
					}]
				};
			} catch (error: any) {
				await errorLogger.logToolError("get_instruction", error, "Failed to retrieve instruction");
				return dbManager.createErrorResponse(`Error retrieving instruction: ${error.message}`);
			}
		}
	);

	// List all instructions
	server.tool(
		"list_instructions",
		{
			category: z.string().optional().describe("Filter by category (modes, workflows, tools, etc.)")
		},
		async (params) => {
			const env = getEnv();
			const dbManager = new DatabaseManager(env);
			const errorLogger = new ErrorLogger(env);
			
			const initialized = await dbManager.ensureInitialized();
			if (!initialized) {
				return dbManager.createInitFailedResponse();
			}

			try {
				let query = `
					SELECT id, name, title, category, version, updated_at
					FROM instruction_sets 
					WHERE active = 1
				`;
				const bindings: any[] = [];

				if (params.category) {
					query += ` AND category = ?`;
					bindings.push(params.category);
				}

				query += ` ORDER BY category, name`;

				const results = await env.DB.prepare(query).bind(...bindings).all();

				if (results.results.length === 0) {
					return {
						content: [{
							type: "text",
							text: "No active instructions found."
						}]
					};
				}

				let response = "📚 **Available Instructions**\n\n";
				let currentCategory = "";
				
				for (const inst of results.results) {
					if (inst.category !== currentCategory) {
						currentCategory = inst.category;
						response += `\n### ${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)}\n`;
					}
					response += `- **${inst.name}**: ${inst.title} (v${inst.version})\n`;
				}

				return {
					content: [{
						type: "text",
						text: response
					}]
				};
			} catch (error: any) {
				await errorLogger.logToolError("list_instructions", error, "Failed to list instructions");
				return dbManager.createErrorResponse(`Error listing instructions: ${error.message}`);
			}
		}
	);

	// Search instructions
	server.tool(
		"search_instructions",
		{
			search_term: z.string().describe("Search term to find in instruction content"),
			limit: z.number().default(5).describe("Maximum results")
		},
		async (params) => {
			const env = getEnv();
			const dbManager = new DatabaseManager(env);
			const errorLogger = new ErrorLogger(env);
			
			const initialized = await dbManager.ensureInitialized();
			if (!initialized) {
				return dbManager.createInitFailedResponse();
			}

			try {
				const searchPattern = `%${params.search_term}%`;
				const results = await env.DB.prepare(`
					SELECT name, title, category, 
						   SUBSTR(content, 1, 200) as preview
					FROM instruction_sets 
					WHERE active = 1 
					  AND (content LIKE ? OR title LIKE ? OR name LIKE ?)
					ORDER BY 
						CASE 
							WHEN name LIKE ? THEN 1
							WHEN title LIKE ? THEN 2
							ELSE 3
						END
					LIMIT ?
				`).bind(
					searchPattern, searchPattern, searchPattern,
					searchPattern, searchPattern,
					params.limit
				).all();

				if (results.results.length === 0) {
					return {
						content: [{
							type: "text",
							text: `No instructions found matching "${params.search_term}"`
						}]
					};
				}

				let response = `🔍 **Search Results for "${params.search_term}"**\n\n`;
				for (const inst of results.results) {
					response += `### ${inst.title}\n`;
					response += `- **Name**: ${inst.name}\n`;
					response += `- **Category**: ${inst.category}\n`;
					response += `- **Preview**: ${inst.preview}...\n\n`;
				}

				return {
					content: [{
						type: "text",
						text: response
					}]
				};
			} catch (error: any) {
				await errorLogger.logToolError("search_instructions", error, "Failed to search instructions");
				return dbManager.createErrorResponse(`Error searching instructions: ${error.message}`);
			}
		}
	);

	// Update instruction
	server.tool(
		"update_instruction",
		{
			name: z.string().describe("Instruction name to update"),
			content: z.string().optional().describe("New content"),
			title: z.string().optional().describe("New title"),
			category: z.string().optional().describe("New category"),
			active: z.boolean().optional().describe("Active status")
		},
		async (params) => {
			const env = getEnv();
			const dbManager = new DatabaseManager(env);
			const errorLogger = new ErrorLogger(env);
			
			const initialized = await dbManager.ensureInitialized();
			if (!initialized) {
				return dbManager.createInitFailedResponse();
			}

			try {
				// Build dynamic update query
				const updates: string[] = [];
				const bindings: any[] = [];

				if (params.content !== undefined) {
					updates.push("content = ?");
					bindings.push(params.content);
				}
				if (params.title !== undefined) {
					updates.push("title = ?");
					bindings.push(params.title);
				}
				if (params.category !== undefined) {
					updates.push("category = ?");
					bindings.push(params.category);
				}
				if (params.active !== undefined) {
					updates.push("active = ?");
					bindings.push(params.active ? 1 : 0);
				}

				if (updates.length === 0) {
					return dbManager.createErrorResponse("No fields to update");
				}

				updates.push("updated_at = datetime('now')");
				updates.push("version = version + 1");
				bindings.push(params.name);

				const query = `
					UPDATE instruction_sets 
					SET ${updates.join(", ")}
					WHERE name = ?
				`;

				const result = await env.DB.prepare(query).bind(...bindings).run();

				if (result.meta.changes === 0) {
					return dbManager.createErrorResponse(`No instruction found with name: ${params.name}`);
				}

				return dbManager.createSuccessResponse(`Successfully updated instruction: ${params.name}`);
			} catch (error: any) {
				await errorLogger.logToolError("update_instruction", error, "Failed to update instruction");
				return dbManager.createErrorResponse(`Error updating instruction: ${error.message}`);
			}
		}
	);
}