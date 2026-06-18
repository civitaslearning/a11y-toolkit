# MCP Accessibility Server - Quick Setup Guide

## Prerequisites

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
   - Ensure Docker is running (check the Docker icon in your system tray)
   - Verify installation: `docker --version`

2. **Cursor IDE** - Latest version

## Installation Steps

### 1. Build Docker Image
```bash
cd mcp-accessibility
docker build -t mcp-accessibility:fixed .
```

### 2. Configure Cursor

Add to your Cursor MCP settings (`~/.cursor/mcp-servers.json`):

```json
{
  "mcp-accessibility": {
    "command": "/path/to/mcp-accessibility/run-docker-mcp.sh"
  }
}
```

Replace `/path/to/` with your actual project path.

### 3. Make Script Executable
```bash
chmod +x run-docker-mcp.sh
```

### 4. Restart Cursor
Completely restart Cursor to load the MCP server.

## Using the VNC Browser Viewer

When the MCP server starts a browser session, you can watch it live:

1. **Access VNC viewer**: http://localhost:6081/vnc.html
2. **No password required** - just click "Connect"
3. **Alternative ports** if defaults are busy:
   - Web: http://localhost:6081/vnc.html → http://localhost:6082/vnc.html
   - VNC: 5901 (for VNC clients like RealVNC)

## File Locations

- **Reports**: `./reports/accessibility-reports/`
- **Screenshots**: `./reports/test-reports/`
- **Logs**: Docker container logs via `docker logs mcp-accessibility-*`

## Troubleshooting

### Docker not running
```bash
# Start Docker Desktop application
# Or via terminal:
open -a Docker  # macOS
```

### Port conflicts
Edit `run-docker-mcp.sh`:
```bash
WEB_PORT="${WEB_PORT:-6082}"  # Change 6081 to 6082
VNC_PORT="${VNC_PORT:-5902}"  # Change 5901 to 5902
```

### MCP not appearing in Cursor
1. Verify path in `~/.cursor/mcp-servers.json` is absolute
2. Check script is executable: `ls -la run-docker-mcp.sh`
3. Test manually: `./run-docker-mcp.sh`
4. Restart Cursor completely

### Browser won't display
Ensure VNC is enabled (it's on by default):
```bash
ENABLE_VNC=true ./run-docker-mcp.sh
```

## Quick Test

After setup, in Cursor's chat:
1. Type: "Open browser and go to google.com"
2. Open http://localhost:6081/vnc.html in your browser
3. Watch the automated browser in action!

---
**Note**: The Docker container includes all dependencies (Chromium, Node.js, Playwright) - no local browser installation needed.
