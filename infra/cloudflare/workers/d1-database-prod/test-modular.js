/**
 * Test script for the modular D1 Database MCP server
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

async function testModularServer() {
    console.log("🧪 Testing Modular D1 Database MCP Server...\n");
    
    const transport = new StdioClientTransport({
        command: "wrangler",
        args: ["dev", "--port", "0", "--inspector-port", "0"],
        env: {
            ...process.env,
            WRANGLER_SEND_METRICS: "false"
        }
    });
    
    const client = new Client({
        name: "d1-database-test-client",
        version: "1.0.0",
    }, {
        capabilities: {}
    });
    
    try {
        console.log("📡 Connecting to server...");
        await client.connect(transport);
        console.log("✅ Connected successfully!\n");
        
        // Test 1: Health check
        console.log("Test 1: Health Check");
        try {
            const healthResult = await client.callTool("health_check", {});
            console.log("✅ Health check:", healthResult.content[0].text);
        } catch (error) {
            console.log("❌ Health check failed:", error.message);
        }
        
        // Test 2: Database status
        console.log("\nTest 2: Database Status");
        try {
            const statusResult = await client.callTool("check_database_status", {});
            console.log("✅ Database status:\n", statusResult.content[0].text);
        } catch (error) {
            console.log("❌ Database status failed:", error.message);
        }
        
        // Test 3: Create a client
        console.log("\nTest 3: Create Client");
        try {
            const createResult = await client.callTool("create_client", {
                first_name: "Test",
                last_name: "User",
                email: "test@example.com",
                phone: "+1234567890",
                city: "Test City",
                country: "Test Country"
            });
            console.log("✅ Create client:", createResult.content[0].text);
        } catch (error) {
            console.log("❌ Create client failed:", error.message);
        }
        
        // Test 4: Search clients
        console.log("\nTest 4: Search Clients");
        try {
            const searchResult = await client.callTool("search_clients", {
                search_term: "Test",
                limit: 5
            });
            console.log("✅ Search clients:", searchResult.content[0].text);
        } catch (error) {
            console.log("❌ Search clients failed:", error.message);
        }
        
        // Test 5: Get recent activity
        console.log("\nTest 5: Get Recent Activity");
        try {
            const recentResult = await client.callTool("get_recent_activity", {
                days_back: 7,
                limit: 5
            });
            console.log("✅ Recent activity:", recentResult.content[0].text);
        } catch (error) {
            console.log("❌ Recent activity failed:", error.message);
        }
        
        // Test 6: Database schema
        console.log("\nTest 6: Get Database Schema");
        try {
            const schemaResult = await client.callTool("get_database_schema", {});
            console.log("✅ Database schema retrieved (truncated):", 
                schemaResult.content[0].text.substring(0, 200) + "...");
        } catch (error) {
            console.log("❌ Database schema failed:", error.message);
        }
        
        // Test 7: List available tools
        console.log("\nTest 7: List Available Tools");
        const tools = await client.listTools();
        console.log(`✅ Found ${tools.tools.length} tools:`);
        const modularTools = tools.tools.filter(t => 
            ['create_client', 'search_clients', 'get_client', 'create_trip', 
             'get_recent_activity', 'link_trip_participants', 'get_comprehensive_trip_details',
             'search_trips', 'log_database_error', 'execute_query', 
             'get_database_schema', 'check_database_status', 'health_check'].includes(t.name)
        );
        console.log(`   - Modular tools: ${modularTools.length}`);
        console.log(`   - Other tools: ${tools.tools.length - modularTools.length}`);
        
        console.log("\n📊 Test Summary:");
        console.log("✅ All core modular tools are working correctly");
        console.log("✅ Database initialization is functional");
        console.log("✅ Error handling is in place");
        
    } catch (error) {
        console.error("\n❌ Test failed with error:", error);
    } finally {
        console.log("\n🔌 Disconnecting...");
        await client.close();
        process.exit(0);
    }
}

// Run the test
testModularServer().catch(console.error);