#!/bin/bash
# Helper script to set up a Chromium profile for MCP accessibility testing
# This ensures you log in with Playwright's Chromium (not Google Chrome)

set -e

# Default values
PROFILE_DIR="${HOME}/.chrome-profiles/mcp-accessibility"
URL="${1:-http://localhost:3000}"

echo "=========================================="
echo "MCP Accessibility Profile Setup"
echo "=========================================="
echo ""
echo "This script will open Playwright's Chromium browser."
echo "Please log into your application and then close the browser."
echo ""
echo "Profile directory: $PROFILE_DIR"
echo "URL: $URL"
echo ""

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "Error: npx is not installed. Please install Node.js first."
    exit 1
fi

# Create profile directory if it doesn't exist
mkdir -p "$PROFILE_DIR"

echo "Opening Chromium browser..."
echo "After logging in, close the browser to save your session."
echo ""

# Launch Playwright's Chromium with the profile directory
npx playwright open \
    --browser chromium \
    --user-data-dir="$PROFILE_DIR" \
    "$URL"

echo ""
echo "=========================================="
echo "Profile setup complete!"
echo "=========================================="
echo ""
echo "Your login session is saved at: $PROFILE_DIR"
echo ""
echo "To use this profile with MCP, add to your Claude Code settings:"
echo ""
echo '{'
echo '  "mcpServers": {'
echo '    "mcp-accessibility": {'
echo '      "command": "node",'
echo '      "args": ["./mcp/dist/index.js"],'
echo '      "env": {'
echo "        \"CHROME_USER_DATA_DIR\": \"$PROFILE_DIR\""
echo '      }'
echo '    }'
echo '  }'
echo '}'
echo ""
