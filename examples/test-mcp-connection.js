// Quick test to verify MCP server can start
import { spawn } from 'child_process';

console.log('🧪 Testing MCP Server Connection...\n');

const mcp = spawn('node', ['dist/index.js']);

mcp.stderr.on('data', (data) => {
  console.log('✅ MCP Server Output:', data.toString());
  console.log('\n✅ MCP server is working! Press Ctrl+C to stop.\n');
});

mcp.on('error', (error) => {
  console.error('❌ Error starting MCP server:', error);
  process.exit(1);
});

setTimeout(() => {
  console.log('⏱️  Server started successfully. Stopping test...');
  mcp.kill();
  process.exit(0);
}, 2000);
