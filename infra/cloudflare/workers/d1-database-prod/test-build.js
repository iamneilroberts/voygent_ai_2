/**
 * Simple build test for the modular structure
 */

const { exec } = require('child_process');
const path = require('path');

console.log("🧪 Testing Modular D1 Database Build...\n");

// Test TypeScript compilation with wrangler
const wranglerPath = path.join(__dirname, 'node_modules/.bin/wrangler');
const command = `${wranglerPath} deploy --dry-run --config wrangler-modular.toml`;

console.log("📦 Running build test with command:");
console.log(`   ${command}\n`);

exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
        console.error("❌ Build failed with error:");
        console.error(error.message);
        if (stderr) {
            console.error("\nStderr output:");
            console.error(stderr);
        }
        process.exit(1);
    }
    
    console.log("✅ Build test passed!");
    console.log("\nBuild output:");
    console.log(stdout);
    
    if (stderr) {
        console.log("\nWarnings:");
        console.log(stderr);
    }
    
    console.log("\n📊 Summary:");
    console.log("✅ TypeScript compilation successful");
    console.log("✅ Module imports resolved correctly");
    console.log("✅ Wrangler configuration valid");
    console.log("\n🎉 The modular structure is ready for deployment!");
});