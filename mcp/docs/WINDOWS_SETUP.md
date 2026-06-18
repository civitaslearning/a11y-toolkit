# Windows Setup for MCP Accessibility Server

This directory contains Windows versions of the Docker runner script for the MCP Accessibility Server.

## Prerequisites

1. **Docker Desktop for Windows** must be installed and running
   - Download from: https://www.docker.com/products/docker-desktop/
   - Make sure Docker Desktop is running before using the scripts

2. **For PowerShell script**: PowerShell 5.1 or later (included with Windows 10/11)

## Available Scripts

### PowerShell Script (Recommended)
**File**: `run-docker-mcp.ps1`

This is the recommended option as it provides better error handling and colored output.

#### Usage:
```powershell
# Basic usage (VNC enabled by default)
.\run-docker-mcp.ps1

# Disable VNC mode
$env:ENABLE_VNC="false"; .\run-docker-mcp.ps1

# Use custom ports
$env:VNC_PORT="5902"; $env:WEB_PORT="6082"; .\run-docker-mcp.ps1
```

**Note**: If you get an execution policy error, run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Batch Script
**File**: `run-docker-mcp.bat`

Alternative for environments where PowerShell scripts are restricted.

#### Usage:
```batch
REM Basic usage (VNC enabled by default)
run-docker-mcp.bat

REM Disable VNC mode
set ENABLE_VNC=false && run-docker-mcp.bat

REM Use custom ports
set VNC_PORT=5902 && set WEB_PORT=6082 && run-docker-mcp.bat
```

## Cursor MCP Configuration

To use with Cursor, update your MCP configuration file:

### For PowerShell:
```json
{
  "mcpServers": {
    "mcp-accessibility": {
      "command": "powershell",
      "args": ["-ExecutionPolicy", "Bypass", "-File", "C:\\path\\to\\run-docker-mcp.ps1"]
    }
  }
}
```

### For Batch:
```json
{
  "mcpServers": {
    "mcp-accessibility": {
      "command": "cmd",
      "args": ["/c", "C:\\path\\to\\run-docker-mcp.bat"]
    }
  }
}
```

## Features

Both scripts provide:
- Automatic Docker image building if not present
- VNC support for browser viewing (enabled by default)
- Report directory creation and mounting
- Docker daemon status checking
- Error handling and user feedback

## Viewing the Browser

When VNC mode is enabled (default), you can view the browser at:
- **Web Interface**: http://localhost:6081/vnc.html
- **VNC Client**: Connect to localhost:5901

## Reports

Reports are saved to the `reports` subdirectory:
- `reports/accessibility-reports/` - Accessibility test reports
- `reports/test-reports/` - General test reports

## Troubleshooting

1. **"Docker daemon is not running"**: Start Docker Desktop
2. **Port already in use**: Change ports using environment variables
3. **Permission errors**: Run PowerShell/CMD as Administrator
4. **Execution policy error** (PowerShell): See note in PowerShell section above

## Differences from Linux/Mac Script

The Windows scripts maintain feature parity with the original bash script:
- Same Docker configuration
- Same VNC support
- Same report directory structure
- Same environment variable options

The main differences are:
- PowerShell/Batch syntax instead of bash
- Windows path handling for volume mounts
- Different process ID variable for container naming
