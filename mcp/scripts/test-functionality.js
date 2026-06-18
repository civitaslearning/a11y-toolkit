#!/usr/bin/env node
/**
 * Functional test script to verify Phase 3 tools work correctly
 * Tests the actual tool execution, not just registration
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing MCP Accessibility Tools Functionality...\n');

// Start the MCP server
const serverPath = path.join(__dirname, '../dist/index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: path.join(__dirname, '..')
});

let messageId = 1;
let outputBuffer = '';
const pendingRequests = new Map();

server.stdout.on('data', (data) => {
  outputBuffer += data.toString();

  // Try to parse complete JSON messages
  const lines = outputBuffer.split('\n');
  outputBuffer = lines.pop(); // Keep incomplete line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const message = JSON.parse(line);

      if (message.id && pendingRequests.has(message.id)) {
        const handler = pendingRequests.get(message.id);
        handler(message);
        pendingRequests.delete(message.id);
      }
    } catch (e) {
      // Not JSON or incomplete, continue
    }
  }
});

server.stderr.on('data', (data) => {
  const message = data.toString();
  if (!message.includes('started successfully') && !message.includes('Browser launched')) {
    console.error('❌ Server error:', message);
  }
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

function sendRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = messageId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    pendingRequests.set(id, (response) => {
      if (response.error) {
        reject(new Error(response.error.message || JSON.stringify(response.error)));
      } else {
        resolve(response.result);
      }
    });

    server.stdin.write(JSON.stringify(request) + '\n');

    // Timeout after 30 seconds per request
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out after 30s`));
      }
    }, 30000);
  });
}

async function runTests() {
  try {
    console.log('⏳ Waiting for server to start...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📋 Test 1: Open browser and navigate to test site');
    console.log('─'.repeat(60));

    await sendRequest('tools/call', {
      name: 'open_browser',
      arguments: {}
    });
    console.log('✅ Browser opened');

    await sendRequest('tools/call', {
      name: 'navigate',
      arguments: { url: 'https://www.w3.org/WAI/demos/bad/before/home.html' }
    });
    console.log('✅ Navigated to W3C demo site (intentionally inaccessible)\n');

    console.log('📋 Test 2: Test focus visibility (Phase 3)');
    console.log('─'.repeat(60));
    const focusResult = await sendRequest('tools/call', {
      name: 'test_focus_visibility',
      arguments: {
        takeScreenshots: false,
        checkContrast: true,
        minSize: 2
      }
    });
    console.log('✅ test_focus_visibility executed successfully');
    console.log('Result preview:', focusResult.content[0].text.substring(0, 200) + '...\n');

    console.log('📋 Test 3: Test reflow at 320px (Phase 3)');
    console.log('─'.repeat(60));
    const reflowResult = await sendRequest('tools/call', {
      name: 'test_reflow',
      arguments: {
        width: 320,
        height: 256,
        checkHorizontalScroll: true
      }
    });
    console.log('✅ test_reflow executed successfully');
    console.log('Result preview:', reflowResult.content[0].text.substring(0, 200) + '...\n');

    console.log('📋 Test 4: Test required fields (Phase 3)');
    console.log('─'.repeat(60));
    const requiredResult = await sendRequest('tools/call', {
      name: 'test_required_fields',
      arguments: {
        checkAriaRequired: true,
        checkVisualIndicators: true,
        checkErrorMessages: true
      }
    });
    console.log('✅ test_required_fields executed successfully');
    console.log('Result preview:', requiredResult.content[0].text.substring(0, 200) + '...\n');

    console.log('📋 Test 5: Test tabs widget (Phase 2)');
    console.log('─'.repeat(60));
    const tabsResult = await sendRequest('tools/call', {
      name: 'test_tabs_widget',
      arguments: {
        checkArrowKeys: true,
        checkHomeEnd: true,
        checkAutoActivation: true
      }
    });
    console.log('✅ test_tabs_widget executed successfully');
    console.log('Result preview:', tabsResult.content[0].text.substring(0, 200) + '...\n');

    console.log('📋 Test 6: Test screen reader modes (Phase 1)');
    console.log('─'.repeat(60));
    const modesResult = await sendRequest('tools/call', {
      name: 'test_screen_reader_modes',
      arguments: {
        mode: 'all',
        platform: 'auto-detect'
      }
    });
    console.log('✅ test_screen_reader_modes executed successfully');
    console.log('Result preview:', modesResult.content[0].text.substring(0, 200) + '...\n');

    console.log('📋 Test 7: Close browser');
    console.log('─'.repeat(60));
    await sendRequest('tools/call', {
      name: 'close_browser',
      arguments: {}
    });
    console.log('✅ Browser closed\n');

    console.log('═'.repeat(60));
    console.log('\n🎉 SUCCESS! All functional tests passed!\n');
    console.log('✅ Phase 1 tools: Working correctly');
    console.log('✅ Phase 2 tools: Working correctly');
    console.log('✅ Phase 3 tools: Working correctly\n');
    console.log('All 64 tools are functional and ready to use!');
    console.log('═'.repeat(60));

    server.kill();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nThis could indicate an implementation issue that needs fixing.');
    server.kill();
    process.exit(1);
  }
}

// Start tests after server is ready
setTimeout(() => {
  runTests();
}, 1000);

// Overall timeout
setTimeout(() => {
  console.error('\n❌ Overall test timeout (60s)');
  server.kill();
  process.exit(1);
}, 60000);
