#!/usr/bin/env node
/**
 * Quick test script to verify all MCP tools are registered correctly
 * Run: node scripts/test-tools.js
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing MCP Accessibility Server...\n');

// Expected new tools from Phase 1 (Platform-specific)
const PLATFORM_TOOLS = [
  'test_screen_reader_modes',
  'test_platform_aria_support',
  'test_high_contrast',
  'test_table_navigation',
  'test_verbosity_levels',
  'test_quick_navigation',
  'test_virtual_buffer',
  'test_rotor_navigation',
  'get_platform_announcements',
  'test_math_content'
];

// Expected new tools from Phase 2 (Widget keyboard testing)
const WIDGET_TOOLS = [
  'test_tabs_widget',
  'test_accordion_widget',
  'test_combobox_widget',
  'test_slider_widget',
  'test_menu_widget',
  'test_listbox_widget',
  'test_radio_group_widget',
  'test_tree_widget',
  'test_modal_dialog_widget',
  'test_date_picker_widget',
  'test_data_table_widget',
  'test_carousel_widget',
  'test_toolbar_widget'
];

// Expected new tools from Phase 3 (Visual/responsive testing)
const VISUAL_TOOLS = [
  'test_focus_visibility',
  'test_hover_focus_dismissal',
  'test_reflow',
  'test_text_resize',
  'test_text_spacing',
  'test_auto_refresh',
  'test_animation_control',
  'test_error_messages',
  'test_required_fields',
  'test_orientation_lock'
];

// All new tools combined for marking in output
const NEW_TOOLS = [...PLATFORM_TOOLS, ...WIDGET_TOOLS, ...VISUAL_TOOLS];

// Expected minimum tools (31 existing + 10 platform + 13 widget + 10 visual)
const EXPECTED_MINIMUM = 64;

// Start the MCP server
const serverPath = path.join(__dirname, '../dist/index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: path.join(__dirname, '..')
});

let outputBuffer = '';
let foundTools = null;

server.stdout.on('data', (data) => {
  outputBuffer += data.toString();

  // Try to parse complete JSON messages
  const lines = outputBuffer.split('\n');
  outputBuffer = lines.pop(); // Keep incomplete line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const message = JSON.parse(line);
      if (message.result && message.result.tools) {
        foundTools = message.result.tools;
        analyzeTools(foundTools);
        server.kill();
      }
    } catch (e) {
      // Not JSON or incomplete, continue
    }
  }
});

server.stderr.on('data', (data) => {
  const message = data.toString();
  if (!message.includes('started successfully')) {
    console.error('❌ Server error:', message);
  }
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

// Send tools/list request after server starts
setTimeout(() => {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  server.stdin.write(JSON.stringify(request) + '\n');
}, 500);

// Timeout after 10 seconds
setTimeout(() => {
  if (!foundTools) {
    console.error('❌ Timeout: Server did not respond within 10 seconds');
    server.kill();
    process.exit(1);
  }
}, 10000);

function analyzeTools(tools) {
  console.log('📊 Test Results:\n');
  console.log('─'.repeat(60));

  // Check total count
  const totalCount = tools.length;
  const totalPass = totalCount >= EXPECTED_MINIMUM;
  console.log(`${totalPass ? '✅' : '❌'} Total tools: ${totalCount} (expected: ${EXPECTED_MINIMUM}+)`);

  // Check for Phase 1 platform-specific tools
  const platformToolsFound = PLATFORM_TOOLS.filter(name =>
    tools.some(t => t.name === name)
  );
  const platformToolsPass = platformToolsFound.length === PLATFORM_TOOLS.length;
  console.log(`${platformToolsPass ? '✅' : '❌'} Platform-specific tools (Phase 1): ${platformToolsFound.length}/${PLATFORM_TOOLS.length}`);

  // Check for Phase 2 widget tools
  const widgetToolsFound = WIDGET_TOOLS.filter(name =>
    tools.some(t => t.name === name)
  );
  const widgetToolsPass = widgetToolsFound.length === WIDGET_TOOLS.length;
  console.log(`${widgetToolsPass ? '✅' : '❌'} Widget keyboard testing tools (Phase 2): ${widgetToolsFound.length}/${WIDGET_TOOLS.length}`);

  // Check for Phase 3 visual/responsive tools
  const visualToolsFound = VISUAL_TOOLS.filter(name =>
    tools.some(t => t.name === name)
  );
  const visualToolsPass = visualToolsFound.length === VISUAL_TOOLS.length;
  console.log(`${visualToolsPass ? '✅' : '❌'} Visual/responsive testing tools (Phase 3): ${visualToolsFound.length}/${VISUAL_TOOLS.length}\n`);

  console.log('─'.repeat(60));
  console.log('📋 Phase 1: Platform-Specific Tools:\n');

  // Show details of Phase 1 tools
  platformToolsFound.forEach((toolName, index) => {
    const tool = tools.find(t => t.name === toolName);
    console.log(`${index + 1}. ${tool.name}`);
    console.log(`   ${tool.description.substring(0, 70)}${tool.description.length > 70 ? '...' : ''}`);
  });

  console.log('\n' + '─'.repeat(60));
  console.log('📋 Phase 2: Widget Keyboard Testing Tools:\n');

  // Show details of Phase 2 tools
  widgetToolsFound.forEach((toolName, index) => {
    const tool = tools.find(t => t.name === toolName);
    console.log(`${index + 1}. ${tool.name}`);
    console.log(`   ${tool.description.substring(0, 70)}${tool.description.length > 70 ? '...' : ''}`);
  });

  console.log('\n' + '─'.repeat(60));
  console.log('📋 Phase 3: Visual/Responsive Testing Tools:\n');

  // Show details of Phase 3 tools
  visualToolsFound.forEach((toolName, index) => {
    const tool = tools.find(t => t.name === toolName);
    console.log(`${index + 1}. ${tool.name}`);
    console.log(`   ${tool.description.substring(0, 70)}${tool.description.length > 70 ? '...' : ''}`);
  });

  // Check for missing tools
  const missingPlatformTools = PLATFORM_TOOLS.filter(name =>
    !tools.some(t => t.name === name)
  );
  const missingWidgetTools = WIDGET_TOOLS.filter(name =>
    !tools.some(t => t.name === name)
  );
  const missingVisualTools = VISUAL_TOOLS.filter(name =>
    !tools.some(t => t.name === name)
  );

  if (missingPlatformTools.length > 0 || missingWidgetTools.length > 0 || missingVisualTools.length > 0) {
    console.log('\n❌ Missing tools:');
    if (missingPlatformTools.length > 0) {
      console.log('\nPlatform tools:');
      missingPlatformTools.forEach(name => console.log(`   - ${name}`));
    }
    if (missingWidgetTools.length > 0) {
      console.log('\nWidget tools:');
      missingWidgetTools.forEach(name => console.log(`   - ${name}`));
    }
    if (missingVisualTools.length > 0) {
      console.log('\nVisual/responsive tools:');
      missingVisualTools.forEach(name => console.log(`   - ${name}`));
    }
  }

  console.log('\n' + '─'.repeat(60));

  // List all tools
  console.log(`\n📝 All ${totalCount} tools registered:`);
  tools.forEach((tool, i) => {
    const isNew = NEW_TOOLS.includes(tool.name);
    console.log(`   ${(i + 1).toString().padStart(2, ' ')}. ${tool.name}${isNew ? ' 🆕' : ''}`);
  });

  console.log('\n' + '─'.repeat(60));

  // Final summary
  const allPass = totalPass && platformToolsPass && widgetToolsPass && visualToolsPass;
  if (allPass) {
    console.log('\n🎉 SUCCESS! All tools registered correctly!');
    console.log('✅ Phase 1 complete: 10 platform-specific tools added');
    console.log('✅ Phase 2 complete: 13 widget keyboard testing tools added');
    console.log('✅ Phase 3 complete: 10 visual/responsive testing tools added');
    console.log(`\n📊 Total: ${totalCount} tools (31 base + 10 platform + 13 widget + 10 visual)`);
    console.log('\n📚 Next steps:');
    console.log('   1. Test in Claude Desktop (see TESTING.md)');
    console.log('   2. Test in Cursor IDE');
    console.log('   3. Test visual/responsive tools on real websites');
    console.log('   4. Continue to Phase 4: Add Cursor integration (.cursorrules, commands)');
  } else {
    console.log('\n❌ FAILED: Some tools are missing or incorrectly registered');
    console.log('   Check the implementation and rebuild: npm run build');
  }

  console.log('\n');
  process.exit(allPass ? 0 : 1);
}
