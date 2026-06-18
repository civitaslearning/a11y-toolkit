#!/bin/bash

# Docker entrypoint script for MCP Accessibility Server
# Handles both VNC and non-VNC modes while maintaining stdio for MCP

# Create reports directories if they don't exist
mkdir -p /app/reports/accessibility-reports /app/reports/test-reports
chown -R mcp:mcp /app/reports

if [ "$ENABLE_VNC" = "true" ]; then
    echo "Starting VNC services..." >&2
    
    # Start Xvfb (virtual display)
    Xvfb :99 -screen 0 1280x720x24 &
    XVFB_PID=$!
    sleep 2
    
    # Start x11vnc
    x11vnc -display :99 -forever -nopw -quiet -shared -rfbport 5900 &
    X11VNC_PID=$!
    sleep 1
    
    # Start noVNC web server
    cd /opt/novnc && ./utils/novnc_proxy --vnc localhost:5900 --listen 6080 > /dev/null 2>&1 &
    NOVNC_PID=$!
    
    echo "VNC services started:" >&2
    echo "  - Web viewer: http://localhost:6080/vnc.html" >&2
    echo "  - VNC port: 5900" >&2
    echo "  - PIDs: Xvfb=$XVFB_PID, x11vnc=$X11VNC_PID, noVNC=$NOVNC_PID" >&2
    
    # Trap signals to cleanup background processes
    trap "kill $XVFB_PID $X11VNC_PID $NOVNC_PID 2>/dev/null; exit" EXIT INT TERM
fi

# Set display for headed browser mode
export DISPLAY=${DISPLAY:-:99}
export FORCE_HEADED_BROWSER=true

# Run the MCP server as the main process (for stdio communication with Cursor)
exec node /app/dist/index.js
