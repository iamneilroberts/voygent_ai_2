/**
 * Prompt Instructions D1 MCP Server
 * Dynamic instruction management using Cloudflare D1 database
 * Using direct JSON-RPC implementation for Cloudflare Workers compatibility
 */

// Environment interface
interface Env {
  DB: D1Database;
  INSTRUCTIONS_CACHE: KVNamespace;
  MCP_AUTH_KEY: string;
}

// Database helper functions
class InstructionManager {
  constructor(private db: D1Database, private cache?: KVNamespace) {}

  async getInstruction(name: string) {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get(`instruction:${name}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Query database
    const result = await this.db
      .prepare('SELECT * FROM instruction_sets WHERE name = ? AND active = 1')
      .bind(name)
      .first();

    if (result && this.cache) {
      // Cache for 1 hour
      await this.cache.put(`instruction:${name}`, JSON.stringify(result), {
        expirationTtl: 3600,
      });
    }

    return result;
  }

  async listInstructions(category?: string) {
    let query = 'SELECT id, name, title, category, created_at FROM instruction_sets WHERE active = 1';
    let params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, name';

    const result = await this.db.prepare(query).bind(...params).all();
    return result.results;
  }

  async createInstruction(data: {
    name: string;
    title: string;
    content: string;
    category?: string;
  }) {
    const result = await this.db
      .prepare(
        'INSERT INTO instruction_sets (name, title, content, category) VALUES (?, ?, ?, ?)'
      )
      .bind(data.name, data.title, data.content, data.category || 'general')
      .run();

    // Clear cache
    if (this.cache) {
      await this.cache.delete(`instruction:${data.name}`);
    }

    return result;
  }

  async updateInstruction(name: string, data: {
    title?: string;
    content?: string;
    category?: string;
  }) {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.content) {
      updates.push('content = ?');
      params.push(data.content);
    }
    if (data.category) {
      updates.push('category = ?');
      params.push(data.category);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(name);

    const result = await this.db
      .prepare(`UPDATE instruction_sets SET ${updates.join(', ')} WHERE name = ?`)
      .bind(...params)
      .run();

    // Clear cache
    if (this.cache) {
      await this.cache.delete(`instruction:${name}`);
    }

    return result;
  }

  async getInstructionsByConfidence(confidenceLevel: string) {
    // Get instruction names for this confidence level
    const mapping = await this.db
      .prepare('SELECT instruction_names FROM confidence_mappings WHERE confidence_level = ?')
      .bind(confidenceLevel)
      .first();

    if (!mapping) {
      return [];
    }

    const instructionNames = JSON.parse(mapping.instruction_names as string);
    const instructions = [];

    for (const name of instructionNames) {
      const instruction = await this.getInstruction(name);
      if (instruction) {
        instructions.push(instruction);
      }
    }

    return instructions;
  }

  async getVerbosityPreference(instructionName?: string): Promise<string> {
    // Check for instruction-specific preference first
    if (instructionName) {
      const specific = await this.db
        .prepare('SELECT preference_value FROM user_preferences WHERE user_id = ? AND preference_type = ?')
        .bind('default', `instruction_verbosity_${instructionName}`)
        .first();
      if (specific) return specific.preference_value as string;
    }
    
    // Fall back to global preference
    const global = await this.db
      .prepare('SELECT preference_value FROM user_preferences WHERE user_id = ? AND preference_type = ?')
      .bind('default', 'instruction_verbosity')
      .first();
    
    return (global?.preference_value as string) || 'normal';
  }

  async setVerbosityPreference(verbosity: string, instructionName?: string): Promise<void> {
    const prefType = instructionName 
      ? `instruction_verbosity_${instructionName}` 
      : 'instruction_verbosity';
    
    // First try to update existing preference
    const updateResult = await this.db
      .prepare(`
        UPDATE user_preferences 
        SET preference_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND preference_type = ?
      `)
      .bind(verbosity, 'default', prefType)
      .run();
    
    // If no rows were updated, insert new preference
    if (updateResult.meta.changes === 0) {
      await this.db
        .prepare(`
          INSERT INTO user_preferences (user_id, preference_type, preference_value) 
          VALUES (?, ?, ?)
        `)
        .bind('default', prefType, verbosity)
        .run();
    }
  }
}

// Handle MCP JSON-RPC requests
async function handleMCPRequest(json: any, env: Env) {
  const { method, id } = json;

  switch (method) {
    case 'initialize':
      const requestedVersion = json.params?.protocolVersion || '2025-06-18';
      const supportedVersions = ['2025-06-18', '2024-11-05'];
      const protocolVersion = supportedVersions.includes(requestedVersion) ? requestedVersion : '2025-06-18';
      
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion,
          capabilities: {
            tools: { listChanged: false }
          },
          serverInfo: {
            name: 'prompt-instructions-d1-mcp',
            version: '1.0.0'
          }
        }
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'get_instruction',
              description: 'Retrieve a specific instruction by name from the D1 database',
              inputSchema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The name/key of the instruction to retrieve',
                  },
                  verbosity: {
                    type: 'string',
                    enum: ['minimal', 'normal', 'verbose'],
                    description: 'Override verbosity level for this request (optional)',
                  },
                },
                required: ['name'],
              },
            },
            {
              name: 'list_instructions',
              description: 'List all available instructions, optionally filtered by category',
              inputSchema: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    description: 'Optional category filter (e.g., modes, planning, search_workflows)',
                  },
                },
              },
            },
            {
              name: 'create_instruction',
              description: 'Create a new instruction in the database',
              inputSchema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Unique name/key for the instruction',
                  },
                  title: {
                    type: 'string',
                    description: 'Human-readable title for the instruction',
                  },
                  content: {
                    type: 'string',
                    description: 'The instruction content in markdown format',
                  },
                  category: {
                    type: 'string',
                    description: 'Category for the instruction (default: general)',
                  },
                },
                required: ['name', 'title', 'content'],
              },
            },
            {
              name: 'update_instruction',
              description: 'Update an existing instruction in the database',
              inputSchema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Name/key of the instruction to update',
                  },
                  title: {
                    type: 'string',
                    description: 'New title for the instruction',
                  },
                  content: {
                    type: 'string',
                    description: 'New content for the instruction',
                  },
                  category: {
                    type: 'string',
                    description: 'New category for the instruction',
                  },
                },
                required: ['name'],
              },
            },
            {
              name: 'get_instructions_by_confidence',
              description: 'Get instructions based on confidence level (high, medium, low, error)',
              inputSchema: {
                type: 'object',
                properties: {
                  confidence_level: {
                    type: 'string',
                    enum: ['high', 'medium', 'low', 'error'],
                    description: 'Confidence level for instruction selection',
                  },
                },
                required: ['confidence_level'],
              },
            },
            {
              name: 'set_verbosity_preference',
              description: 'Set verbosity preference globally or for a specific instruction',
              inputSchema: {
                type: 'object',
                properties: {
                  verbosity: {
                    type: 'string',
                    enum: ['minimal', 'normal', 'verbose'],
                    description: 'Verbosity level for instruction output',
                  },
                  instruction_name: {
                    type: 'string',
                    description: 'Optional: Set verbosity for a specific instruction only',
                  },
                },
                required: ['verbosity'],
              },
            },
            {
              name: 'get_verbosity_preference',
              description: 'Get current verbosity preference',
              inputSchema: {
                type: 'object',
                properties: {
                  instruction_name: {
                    type: 'string',
                    description: 'Optional: Get verbosity for a specific instruction',
                  },
                },
              },
            },
          ],
        },
      };

    case 'tools/call':
      try {
        const { name, arguments: args } = json.params;
        const manager = new InstructionManager(env.DB, env.INSTRUCTIONS_CACHE);

        switch (name) {
          case 'get_instruction': {
            const instruction = await manager.getInstruction(args.name);
            if (!instruction) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `Instruction '${args.name}' not found`,
                    },
                  ],
                },
              };
            }

            // Get verbosity preference (from parameter or stored preference)
            const verbosity = args.verbosity || await manager.getVerbosityPreference(args.name);
            
            let responseText: string;
            
            switch (verbosity) {
              case 'minimal':
                // Just the content, no title or metadata
                responseText = instruction.content;
                break;
                
              case 'verbose':
                // Full details including all metadata
                responseText = `# ${instruction.title}\n\n${instruction.content}\n\n` +
                  `---\n\n` +
                  `**Metadata:**\n` +
                  `- **Name**: ${instruction.name}\n` +
                  `- **Category**: ${instruction.category}\n` +
                  `- **Version**: ${instruction.version}\n` +
                  `- **Active**: ${instruction.active ? 'Yes' : 'No'}\n` +
                  `- **Created**: ${instruction.created_at}\n` +
                  `- **Last Updated**: ${instruction.updated_at}\n` +
                  `- **Verbosity**: ${verbosity}`;
                break;
                
              case 'normal':
              default:
                // Current behavior - title, content, and basic metadata
                responseText = `# ${instruction.title}\n\n${instruction.content}\n\n` +
                  `**Category**: ${instruction.category}\n` +
                  `**Last Updated**: ${instruction.updated_at}`;
                break;
            }

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: responseText,
                  },
                ],
              },
            };
          }

          case 'list_instructions': {
            const instructions = await manager.listInstructions(args.category);
            let output = `# Available Instructions${args.category ? ` (${args.category})` : ''}\n\n`;

            if (instructions.length === 0) {
              output += 'No instructions found.\n';
            } else {
              // Group by category
              const categories: Record<string, any[]> = {};
              for (const inst of instructions) {
                const cat = inst.category || 'general';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(inst);
              }

              Object.entries(categories).forEach(([category, items]) => {
                output += `## ${category.toUpperCase()}\n`;
                items.forEach((inst) => {
                  output += `- **${inst.name}**: ${inst.title}\n`;
                });
                output += '\n';
              });
            }

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: output,
                  },
                ],
              },
            };
          }

          case 'create_instruction': {
            const result = await manager.createInstruction(args);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `✅ Created instruction '${args.name}' with ID ${result.meta?.last_row_id}`,
                  },
                ],
              },
            };
          }

          case 'update_instruction': {
            const result = await manager.updateInstruction(args.name, args);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `✅ Updated instruction '${args.name}' (${result.meta?.changes} changes)`,
                  },
                ],
              },
            };
          }

          case 'get_instructions_by_confidence': {
            const instructions = await manager.getInstructionsByConfidence(args.confidence_level);
            let output = `# Instructions for ${args.confidence_level.toUpperCase()} Confidence Level\n\n`;

            if (instructions.length === 0) {
              output += 'No instructions found for this confidence level.\n';
            } else {
              instructions.forEach((inst) => {
                output += `## ${inst.title}\n\n${inst.content}\n\n---\n\n`;
              });
            }

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: output,
                  },
                ],
              },
            };
          }

          case 'set_verbosity_preference': {
            await manager.setVerbosityPreference(args.verbosity, args.instruction_name);
            const scope = args.instruction_name 
              ? `for instruction '${args.instruction_name}'` 
              : 'globally';
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `✅ Verbosity preference set to '${args.verbosity}' ${scope}`,
                  },
                ],
              },
            };
          }

          case 'get_verbosity_preference': {
            const verbosity = await manager.getVerbosityPreference(args.instruction_name);
            const scope = args.instruction_name 
              ? `for instruction '${args.instruction_name}'` 
              : 'global';
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `Current ${scope} verbosity preference: ${verbosity}`,
                  },
                ],
              },
            };
          }

          default:
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Unknown tool: ${name}` }
            };
        }
      } catch (error: any) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: `Tool execution error: ${error.message}` }
        };
      }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      };
  }
}

// Cloudflare Worker export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      try {
        // Test database connection
        const testResult = await env.DB.prepare('SELECT 1 as test').first();
        
        return new Response(
          JSON.stringify({
            status: 'ok',
            service: 'prompt-instructions-d1-mcp',
            version: '1.0.0',
            database: testResult ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({
            status: 'error',
            service: 'prompt-instructions-d1-mcp',
            error: error.message,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // SSE endpoint for MCP
    if (url.pathname === '/sse' || url.pathname === '/sse/') {
      // For GET requests, establish SSE connection
      if (request.method === 'GET') {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Send initial connection event
        await writer.write(encoder.encode('event: open\ndata: {"type":"connection_ready"}\n\n'));

        // Keep connection alive with periodic pings
        const pingInterval = setInterval(async () => {
          try {
            await writer.write(encoder.encode('event: ping\ndata: {}\n\n'));
          } catch (e) {
            clearInterval(pingInterval);
          }
        }, 30000);

        ctx.waitUntil(
          new Promise<void>((resolve) => {
            request.signal.addEventListener('abort', () => {
              clearInterval(pingInterval);
              writer.close();
              resolve();
            });
          })
        );

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // For POST requests, handle MCP messages
      if (request.method === 'POST') {
        try {
          const text = await request.text();
          let json;
          
          try {
            json = JSON.parse(text);
          } catch (parseError: any) {
            console.error('JSON parse error:', parseError.message, 'Input:', text);
            return new Response(
              JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32700,
                  message: `Parse error: ${parseError.message}`,
                },
              }) + '\n',
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache',
                },
              }
            );
          }
          
          const response = await handleMCPRequest(json, env);

          return new Response(JSON.stringify(response) + '\n', {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-cache',
            },
          });
        } catch (error: any) {
          console.error('Error handling MCP request:', error);
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: `Internal error: ${error.message}`,
              },
            }) + '\n',
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
              },
            }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        error: 'Not found',
        available_endpoints: ['/health', '/sse'],
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};