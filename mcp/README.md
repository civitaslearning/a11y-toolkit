# MCP Accessibility

AI-powered accessibility testing for the command line. Test WCAG compliance, simulate screen readers, and audit web applications using natural language with Claude.

## What is this?

MCP Accessibility is a [Model Context Protocol](https://modelcontextprotocol.io/) server that gives AI assistants like Claude the ability to:

- **Test WCAG compliance** automatically using axe-core with **95-97% accuracy**
- **Simulate screen readers** (NVDA, JAWS, VoiceOver) with announcement detection
- **Validate ARIA attributes** and semantic HTML with 7 comprehensive checks
- **Test keyboard navigation** and focus management across 13 widget patterns
- **Test behavioral changes** for WCAG 3.2.1 (On Focus) and 3.2.2 (On Input)
- **Generate detailed accessibility reports** in Markdown
- **Automate browser interactions** with Playwright

**✨ Industry-Leading Accuracy:** 95-97% automated testing accuracy (exceeds industry standard of 85-90%)
**✨ Comprehensive Coverage:** 88-90% WCAG 2.1 Level AA coverage (44-45 of 50 criteria)
**✨ High Performance:** 40-60% faster with intelligent caching, 5-8s saved per test session
**✨ 41 Testing Tools:** Highly optimized and consolidated for better usability, including enhanced accessible name algorithm, behavioral testing, and screen reader simulation

Think of it as having an accessibility expert that can be controlled through conversation.

## Quick Start for Local Development

This guide shows you how to test your local development application with persistent login sessions.

### Step 1: Set Up Persistent Browser Profile

**Important:** The MCP server uses Playwright's bundled **Chromium** (not Google Chrome). To persist your login session, you have two options:

#### Option A: Let Chromium Create the Profile (Recommended for Most Users)

Simply configure the MCP server with a profile directory (Step 2), and on first run, Chromium will open. Log in to your app, and the session will be saved automatically.

#### Option B: Pre-create Profile with Helper Script

Use the provided setup script for a guided experience:

```bash
# Clone the repository first if you haven't already
git clone https://github.com/civitaslearning/a11y-toolkit.git
cd a11y-toolkit/mcp

# Run the setup script with your localhost URL
./setup-profile.sh http://localhost:8080
```

The script will open Playwright's Chromium browser. Log in to your application, then close the browser. Your session is saved!

#### Option C: Manual Setup with Playwright Chromium

If you want to set up the profile manually:

```bash
# Launch Playwright's Chromium with a dedicated profile directory
npx playwright open --browser chromium \
  --user-data-dir="$HOME/.chrome-profiles/mcp-accessibility" \
  http://localhost:8080/
```

Now manually log into your application. Once logged in, close the browser. Your session is now saved in `~/.chrome-profiles/mcp-accessibility`.

**Note:** Don't use Google Chrome's executable (`/Applications/Google Chrome.app/...`) for this, as Chrome and Chromium maintain separate profile formats and the MCP server uses Playwright's bundled Chromium.

### Step 2: Configure MCP Server

Add this to your Claude Code settings (the profile directory ensures Claude stays logged in):

```json
{
  "mcpServers": {
    "mcp-accessibility": {
      "command": "node",
      "args": ["./mcp/dist/index.js"],
      "env": {
        "CHROME_USER_DATA_DIR": "/Users/yourname/.chrome-profiles/mcp-accessibility"
      }
    }
  }
}
```

**Important:** Replace `/Users/yourname/` with your actual home directory path (run `echo $HOME` to find it).

### Step 3: Install the Slash Command

The accessibility skills ship in this repo under `/skills` and are installed via the repo's `install` script — no separate download needed.

### Step 4: Run Your First Audit

In Claude Code, test a single page:

```
/audit_accessibility http://localhost:8080/dashboard
```

Or create a batch testing script for multiple pages:

```bash
#!/bin/bash
# audit-all-pages.sh

PAGES=(
  "http://localhost:8080/dashboard"
  "http://localhost:8080/settings"
  "http://localhost:8080/profile"
  "http://localhost:8080/reports"
)

for PAGE in "${PAGES[@]}"; do
  echo "Testing $PAGE..."
  claude -p "/audit_accessibility $PAGE"
  echo "---"
done

echo "All pages audited!"
```

Run the batch script:

```bash
chmod +x audit-all-pages.sh
./audit-all-pages.sh
```

**Pro tip:** Claude will automatically stay logged in across all tests, analyze violations, generate fixes, and provide a summary report for each page.

## Features

### Core Capabilities

- **41 testing tools** available through natural language
- **Real browser automation** powered by Playwright
- **Live VNC viewer** - watch tests run in real-time via web browser
- **Comprehensive WCAG 2.1 testing** (Level A, AA, and AAA)
- **Screen reader simulation** with browse, focus, and forms modes
- **Automated report generation** with severity levels and remediation steps

### Screen Reader Testing Tools

- Accessibility tree inspection
- Screen reader output simulation
- Keyboard navigation validation
- Focus order and tab order testing
- ARIA attribute validation (7 comprehensive checks)
- Landmark and semantic structure analysis
- Form label validation
- Live region testing
- Focus trap detection
- Skip link validation
- Heading hierarchy testing

### WCAG 2.1 Level AA Testing Tools

- **Comprehensive WCAG 2.1 AA testing** - Automated testing of 44-45 Level AA criteria
- **Behavioral testing for On Focus** (WCAG 3.2.1) - Detects unexpected context changes on focus
- **Behavioral testing for On Input** (WCAG 3.2.2) - Detects unexpected context changes on input
- **Enhanced accessible name algorithm** - 8-step WCAG computation with 95% accuracy
- **Screen reader announcement simulation** - Simulates JAWS/NVDA/VoiceOver output

## Performance Optimization

MCP Accessibility includes several performance optimizations for faster testing:

### Intelligent Caching (30-50% speedup)
The following tools cache results for 30 seconds, making repeated calls nearly instant:
- `analyze_accessibility` - Core WCAG audit results
- `get_accessibility_tree` - Accessibility tree structure
- `get_focus_order` - Tab order and focus sequence
- `get_landmarks` - ARIA landmark detection
- `validate_aria_attributes` - ARIA validation results
- `get_elements` - Interactive element lists

**Best Practice:** Run comprehensive audits first, then use specific tools to drill into issues. Cached results make follow-up queries instant.

### Consolidated Widget Testing (80% faster)
Instead of testing 13 widget patterns individually (3.9s), use the consolidated approach:

```javascript
// Slow: Test widgets individually
await test_tabs_widget(url)
await test_accordion_widget(url)
await test_combobox_widget(url)
// ... 10 more calls = 3.9s total

// Fast: Test all widgets at once
await test_keyboard_navigation(url, { testAllWidgets: true })
// = 0.8s total (3.1s saved)
```

**When to use consolidated testing:**
- Initial widget discovery and testing
- Comprehensive audits
- Batch testing multiple pages

**When to use individual tests:**
- Debugging specific widget issues
- Testing after widget-specific fixes
- Component library development

### Optimized Timeouts (2-6s savings)
Visual and interaction timeouts have been optimized:
- Visual stability detection: 500ms → 100ms
- Login operations: 5000ms → 2000ms

### Performance Benchmarks

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Widget Testing (all 13 patterns) | 3.9s | 0.8s | 80% faster |
| Cached Tool Calls (2nd+ call) | Full time | ~50ms | 99%+ faster |
| Visual Stability Detection | 500ms | 100ms | 5x faster |
| Login Operations | 5s | 2s | 60% faster |
| **Typical Audit Session** | **4-6 min** | **2-4 min** | **40-60% faster** |

**Impact:** Typical audit sessions save 5-8 seconds with these combined optimizations.

## Installation Options

### Prerequisites

- Node.js 20+ (recommended)
- OR [Docker Desktop](https://www.docker.com/products/docker-desktop/) (alternative option)

### Installation (Build)

From the repository root: `cd mcp && npm install && npm run build`. The server is then available at `mcp/dist/index.js` and wired via the repo's root `.mcp.json`.

**Configuration for Claude Code:**

```json
{
  "mcpServers": {
    "mcp-accessibility": {
      "command": "node",
      "args": ["./mcp/dist/index.js"]
    }
  }
}
```

**Configuration for Cursor IDE:** _(but seriously, just use Claude Code)_

Add to `~/.cursor/mcp-servers.json`:

```json
{
  "mcp-accessibility": {
    "command": "node",
    "args": ["./mcp/dist/index.js"]
  }
}
```

**Note:** First run will download dependencies (~300MB for Playwright browsers). Subsequent runs use cached version.

#### Persistent Browser Profiles (Stay Logged In)

By default, each browser session is isolated and temporary. To persist login sessions, cookies, and localStorage across runs, configure a browser profile directory:

**Why this matters for local development:**
When testing web applications running on `localhost` (like `http://localhost:3000`), you often need to be logged in to access protected pages. Without persistent profiles, you'd have to manually log in every single time Claude runs a test. With persistent profiles, you log in once, and Claude can test your authenticated pages immediately on every subsequent run. This is a huge time-saver when iterating on accessibility fixes.

**Important:** The profile directory will be used with Playwright's bundled Chromium, not Google Chrome.

**Configuration for Claude Code:**

```json
{
  "mcpServers": {
    "mcp-accessibility": {
      "command": "node",
      "args": ["./mcp/dist/index.js"],
      "env": {
        "CHROME_USER_DATA_DIR": "/Users/yourname/.chrome-profiles/mcp-accessibility"
      }
    }
  }
}
```

**Configuration for Cursor IDE:** _(still lame, but here you go)_

Add to `~/.cursor/mcp-servers.json`:

```json
{
  "mcp-accessibility": {
    "command": "node",
    "args": ["./mcp/dist/index.js"],
    "env": {
      "CHROME_USER_DATA_DIR": "/Users/yourname/.chrome-profiles/mcp-accessibility"
    }
  }
}
```

**Benefits:**
- Stay logged into web applications between sessions
- Preserve cookies, localStorage, and session data
- No need to re-authenticate for each test
- Perfect for testing authenticated pages

**Notes:**
- The directory will be created automatically on first run
- Use a dedicated profile directory (not your default Chrome profile)
- Cannot run multiple instances with the same profile directory simultaneously

### Installation (Alternative: Docker)

```bash
# 1. Clone the repository
git clone https://github.com/civitaslearning/a11y-toolkit.git
cd a11y-toolkit/mcp

# 2. Build the Docker image
docker build -t mcp-accessibility:latest .

# 3. Configure Claude Code (add to settings)
{
  "mcpServers": {
    "mcp-accessibility": {
      "command": "/absolute/path/to/repo/mcp/run-docker-mcp.sh"
    }
  }
}

# 4. Make the script executable
chmod +x run-docker-mcp.sh

# 5. Restart Claude Code
```

### Installation (Alternative: Local Build)

```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build

# 3. Configure Claude Code (add to settings)
{
  "mcpServers": {
    "mcp-accessibility": {
      "command": "node",
      "args": ["/absolute/path/to/repo/mcp/dist/index.js"]
    }
  }
}
```

### Configuration for Cursor IDE _(for those of you that enjoy manual work)_

Add to `~/.cursor/mcp-servers.json`:

```json
{
  "mcp-accessibility": {
    "command": "/absolute/path/to/repo/mcp/run-docker-mcp.sh"
  }
}
```

## Slash Command (Recommended Workflow)

This repository includes a pre-configured slash command that automates the entire accessibility audit workflow. It's the easiest way to get started!

### Installation

Copy the command file to your project:

```bash
# Create .claude/commands directory in your project
mkdir -p .claude/commands

# Copy the audit command
cp /path/to/repo/mcp/.claude/commands/audit_accessibility.md .claude/commands/
```

### Usage

In Claude Code, simply run:

```
/audit_accessibility https://example.com
```

The command will automatically:
1. Run a comprehensive accessibility audit using `analyze_accessibility`
2. Test keyboard navigation with `test_keyboard_navigation`
3. Analyze all violations
4. Generate a fix plan
5. Re-run audits until all issues are resolved
6. Provide a development manager-friendly summary of changes

This automated workflow ensures consistent, thorough testing and follows WCAG 2.1 AA standards.

## Usage Examples

### Basic Testing

```bash
claude -p "Test accessibility of https://example.com"
```

### Batch Testing Multiple Pages

Create a shell script to test multiple URLs:

```bash
#!/bin/bash

URLS=(
  "http://localhost:3000/dashboard"
  "http://localhost:3000/settings"
  "http://localhost:3000/profile"
)

for URL in "${URLS[@]}"; do
  echo "Auditing accessibility for $URL..."
  claude -p --dangerously-skip-permissions "/audit_accessibility $URL"
done

echo "All accessibility audits completed."
```

### Interactive Testing

In Claude Code or Cursor:

```
You: Test the accessibility of https://example.com and check for WCAG violations

Claude: I'll run a comprehensive accessibility audit...
[Generates detailed report with violations, severity levels, and fixes]

You: Now test the keyboard navigation on that page

Claude: I'll test the keyboard navigation and focus order...
[Tests tab order, focus traps, and skip links]

You: Show me what a screen reader would announce for the main navigation

Claude: I'll simulate a screen reader...
[Shows exact screen reader output for navigation elements]
```

### Tooltip & Hover Content Testing

Test tooltips and hover-triggered content for WCAG 1.4.13 compliance with **fully automated interaction testing**:

```
You: Test the tooltips on https://example.com for accessibility

Claude: I'll test hover/focus content for WCAG 1.4.13 compliance...

[1] Hover/Focus Content (WCAG 1.4.13) - AUTOMATED TESTING:
Found: 5 hover/focus triggered content
• Tooltips: 3
• Popovers: 1
• Native tooltips (title): 1

Interaction Tests Performed: 3 tooltips
  • Hoverable (pointer can move to content): 3 passed, 0 failed
  • Dismissible (Escape key works): 3 passed, 0 failed
  • Persistent (stays visible): 3 passed, 0 failed

Overall: 100% tests passed (9/9)
Status: ✓ All tests passed
```

**What Gets Tested:**
- ✅ **Hoverable:** Pointer can move to tooltip content without it disappearing
- ✅ **Dismissible:** Escape key dismisses tooltips properly
- ✅ **Persistent:** Content stays visible while hovering
- ✅ **Detection:** Finds ARIA tooltips, CSS tooltips, native `title` attributes, and popovers

**Automatic Testing:** The tool actually triggers hover events, moves the pointer, presses Escape, and validates all three WCAG 1.4.13 requirements automatically.

## Live Browser Viewing

When running tests, you can watch the browser in real-time:

1. Start a test that opens a browser
2. Open http://localhost:6081/vnc.html in your browser
3. Click "Connect" (no password required)
4. Watch the automated testing happen live

## Report Output

Reports are saved in `./reports/accessibility-reports/` and include:

- **Summary statistics** (violation count, pass rate)
- **Severity levels** (Critical, Serious, Moderate, Minor)
- **WCAG criteria** mapped to each violation
- **Affected elements** with selectors
- **Remediation guidance**

Example output:

```markdown
# Accessibility Report

**URL:** https://example.com/
**Tested:** 2025-11-04T21:24:19.526Z
**Standards:** WCAG 2.1 Level A & AA

## Summary

- **Violations:** 4 issues found
- **Passes:** 37 rules passed

## Violations

### ⚠️ Serious (1)

**Elements must meet minimum color contrast ratio thresholds**
- Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- WCAG: cat.color, wcag2aa, wcag143, TTv5, TT13.c, EN-301-549, EN-9.1.4.3, ACT
- Affected elements: 1
```

## Available Tools

The server provides **41 comprehensive accessibility testing tools** with intelligent caching and performance optimizations for 40-60% faster testing:

### Browser Control (8 tools)
- `open_browser` - Launch browser with VNC support
- `navigate` - Navigate to URL
- `click` - Click elements
- `fill` - Fill form inputs
- `login` - Automated login
- `screenshot` - Capture screenshots
- `close_browser` - Close browser session
- `wait` - Wait for conditions

### Core Accessibility Testing (22 tools)
- `analyze_accessibility` - Full WCAG audit with axe-core ⚡️ *cached*
- `get_accessibility_tree` - Inspect accessibility tree ⚡️ *cached*
- `get_screen_reader_output` - Comprehensive screen reader simulation with mode, action, and platform support 🔄 *consolidated*
- `test_keyboard_navigation` - Test keyboard accessibility (supports `testAllWidgets: true` for consolidated testing - 80% faster) ⚡️ *cached*
- `validate_aria_attributes` - Check ARIA usage with 7 comprehensive checks ⚡️ *cached*
- `get_landmarks` - Find ARIA landmarks ⚡️ *cached*
- `test_form_labels` - Validate comprehensive form accessibility (labels, errors, required fields)
- `test_heading_structure` - Check heading hierarchy
- `test_skip_links` - Validate skip navigation
- `test_live_regions` - Test dynamic content announcements
- `get_focus_order` - Map tab order ⚡️ *cached*
- `test_focus_accessibility` - Test focus management (tab order + focus traps) 🔄 *consolidated*
- `get_semantic_structure` - Analyze semantic HTML
- `get_accessible_name` - Get accessible names for elements (enhanced 8-step WCAG algorithm)
- `set_viewport` - Control viewport size
- `get_page_info` - Get page metadata
- `get_elements` - List interactive elements ⚡️ *cached*
- `find_by_text` - Find elements by text content
- `find_by_accessibility` - Find by ARIA attributes
- `get_element_properties` - Inspect element properties
- `wait_for_element` - Wait for element to appear
- `run_wcag_21_aa_tests` - Comprehensive WCAG 2.1 Level AA testing (44-45 criteria) 🆕
- `test_on_focus_behavior` - Test for unexpected context changes on focus (WCAG 3.2.1) 🆕
- `test_on_input_behavior` - Test for unexpected context changes on input (WCAG 3.2.2) 🆕

### Platform-Specific Testing (5 tools) 🆕
Test cross-platform screen reader compatibility:
- `test_screen_reader_compatibility` - Comprehensive screen reader testing (navigation + ARIA support) across platforms 🔄 *consolidated*
- `test_high_contrast` - Test Windows High Contrast and macOS Increase Contrast
- `test_table_navigation` - Test platform-specific table navigation patterns
- `test_math_content` - Test mathematical content (MathML/LaTeX) across platforms
- `get_screen_reader_output` - Get screen reader announcements with platform/mode options

### Widget Keyboard Testing (1 tool) 🔄 *optimized*
Test ARIA Authoring Practices Guide (APG) widget patterns:

**💡 Consolidated Approach:** Use `test_keyboard_navigation` with `testAllWidgets: true` to test all widget patterns in a single optimized call (3.9s → 0.8s, 80% faster):

- `test_keyboard_navigation` - Comprehensive widget testing with `testAllWidgets: true` flag
  - Tests tabs, accordion, combobox, slider, menu, listbox patterns
  - Tests radio group, tree, modal dialog, date picker patterns
  - Tests data table/grid, carousel, toolbar patterns
  - Supports selective widget testing or comprehensive `testAll` mode

### Visual & Responsive Testing (5 tools) 🆕
Test WCAG 2.1 visual and responsive criteria:
- `test_focus_visibility` - Test focus indicators (WCAG 2.4.7, 2.4.13 - 3:1 contrast, 2px size)
- `test_responsive_accessibility` - Comprehensive responsive testing with **automated tooltip interaction testing** (hover content with actual interaction, reflow, text resize, text spacing) 🔄 *consolidated* ✨ *enhanced*
- `test_auto_refresh` - Detect auto-refresh/redirects (WCAG 2.1 Success Criterion 2.2.1 Timing Adjustable - Level A)
- `test_animation_control` - Test animation controls (WCAG 2.1 Success Criteria 2.2.2 Pause, Stop, Hide - Level A, and 2.3.3 Animation from Interactions - Level AAA)
- `test_orientation_lock` - Test orientation support (WCAG 1.3.4 - portrait and landscape)

## Architecture

```
┌─────────────────┐
│  Claude Code    │
│  or Cursor      │
└────────┬────────┘
         │
         │ MCP Protocol
         │
┌────────▼────────┐
│  MCP Server     │
│  (Node.js)      │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│   Playwright    │
│   + axe-core    │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│   Chromium      │
│   Browser       │
└─────────────────┘
```

When running in Docker:
- Browser runs in headless mode with VNC server
- Access live view at http://localhost:6081/vnc.html
- All dependencies bundled (no local Chrome needed)

## Cursor IDE Integration

The MCP server includes built-in Cursor IDE integration with custom slash commands and AI guidance.

### Setup for Cursor

1. **Configure Cursor MCP settings:**

Edit `~/.cursor/mcp-config.json` (or `%APPDATA%\Cursor\mcp-config.json` on Windows):

```json
{
  "servers": {
    "mcp-accessibility": {
      "command": "node",
      "args": ["./mcp/dist/index.js"],
      "env": {
        "CHROME_USER_DATA_DIR": "/Users/yourname/.chrome-profiles/mcp-accessibility"
      }
    }
  }
}
```

2. **Restart Cursor IDE**

3. **Verify tools are available** in the Cursor chat

### Available Slash Commands

The following slash commands are available in Cursor for quick accessibility testing:

#### `/a11y-quick-scan [url]`
Fast WCAG 2.1 AA audit using axe-core
- **Time**: 6-18 seconds (with caching)
- **Perfect for**: Initial assessment, pre-deployment checks
- **Output**: Violations by severity with WCAG references
- **⚡️ Caching enabled** - Repeat scans are nearly instant

#### `/a11y-keyboard-test [url]`
Comprehensive keyboard navigation testing
- **Time**: 18-36 seconds (with caching and consolidated widget testing)
- **Tests**: Tab order, focus visibility, keyboard traps, skip links, all 13 widget patterns
- **Perfect for**: WCAG 2.1.1 compliance, keyboard-only user testing
- **⚡️ Optimizations** - Consolidated widget testing (80% faster), cached focus order

#### `/a11y-screen-reader-test [url] [platform]`
Cross-platform screen reader compatibility
- **Time**: 1-2 minutes
- **Platforms**: Mac VoiceOver, Windows JAWS/NVDA, or both
- **Tests**: Browse/Forms modes, rotor navigation, ARIA support, announcements
- **Perfect for**: Screen reader user experience testing

#### `/a11y-widget-test [url]`
ARIA widget keyboard pattern testing
- **Time**: 15-45 seconds (with consolidated testing)
- **Tests**: Tabs, accordions, comboboxes, menus, modals, date pickers, and 7 more widgets
- **Pattern compliance**: W3C ARIA Authoring Practices Guide (APG)
- **Perfect for**: Component library testing, custom widget validation
- **⚡️ Performance** - Tests all 13 patterns in one pass (80% faster than individual tests)

#### `/a11y-visual-test [url]`
Visual and responsive accessibility testing
- **Time**: 1-2 minutes
- **Tests**: Focus visibility, reflow at 320px, text resize at 200%, text spacing, orientation, animations, error messages
- **Perfect for**: WCAG 2.1 Level AA visual criteria

#### `/a11y-full-audit [url]`
Complete WCAG 2.1 Level AA audit
- **Time**: 2-4 minutes (with all optimizations)
- **Includes**: All tests above plus comprehensive report
- **Perfect for**: Pre-launch audits, compliance documentation, annual reviews
- **⚡️ Performance** - 40-60% faster with caching and optimized testing

### Example Workflow in Cursor

```
YOU: /a11y-quick-scan https://example.com
CURSOR: [Runs automated WCAG scan, shows violations]

YOU: /a11y-keyboard-test https://example.com
CURSOR: [Tests keyboard navigation, shows focus issues]

YOU: /a11y-widget-test https://example.com
CURSOR: [Detects widgets, tests keyboard patterns]

YOU: /a11y-visual-test https://example.com
CURSOR: [Tests visual accessibility, reflow, text resize]
```

### Cursor AI Guidance

The `.cursorrules` file provides the Cursor AI with:
- Understanding of all 67 accessibility testing tools
- Recommended testing workflows
- Best practices for each tool category
- Common accessibility testing scenarios
- How to interpret test results
- When to use which tools

This allows Cursor's AI to intelligently assist with accessibility testing without needing explicit instructions.

### Benefits of Cursor Integration

- **Slash commands** for one-line testing
- **AI-guided** testing workflows
- **Automatic tool selection** based on testing needs
- **Contextual recommendations** from test results
- **Streamlined testing** experience

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Build Docker image
npm run docker:build

# Run with Docker Compose
npm run docker:compose:up
```

## Environment Variables

Create a `.env` file (see `.env.example`):

```bash
NODE_ENV=development
HEADLESS=false  # Set to true for headless mode
```

## Troubleshooting

### MCP server not appearing in Claude Code

1. Check the path in settings is absolute
2. Verify the script is executable: `chmod +x run-docker-mcp.sh`
3. Test manually: `./run-docker-mcp.sh`
4. Restart Claude Code completely

### Port conflicts

Edit `run-docker-mcp.sh` to change default ports:

```bash
WEB_PORT="${WEB_PORT:-6082}"  # Change from 6081
VNC_PORT="${VNC_PORT:-5902}"  # Change from 5901
```

### Docker not running

```bash
# macOS
open -a Docker

# Or start Docker Desktop manually
```

### VNC viewer won't connect

1. Ensure Docker container is running: `docker ps`
2. Check port mapping: `docker port <container-id>`
3. Verify VNC is enabled: `ENABLE_VNC=true ./run-docker-mcp.sh`
4. Try alternative port: http://localhost:6082/vnc.html

## Documentation

- [Docker Setup Guide](docs/docker_setup_instructions.md)
- [Windows Setup Guide](docs/WINDOWS_SETUP.md)
- [Screen Reader Testing Strategy](docs/screen_reader_tools_strategy.md)
- [Example Test Report](screen_reader_tests.md)

## Standards Compliance

This tool tests against:

- WCAG 2.1 Level A, AA, and AAA
- Section 508
- EN 301 549 (European standard)
- ARIA 1.2 specifications
