#!/bin/bash

# MCP Accessibility Server Docker Runner
# This script runs the MCP server in a Docker container
# Use this script as the command in your Cursor MCP configuration
# 
# For browser viewing, run with ENABLE_VNC=true:
#   ENABLE_VNC=true ./run-docker-mcp.sh
# Then open http://localhost:6080/vnc.html in your browser

# Configuration
IMAGE_NAME="mcp-accessibility:fixed"
CONTAINER_NAME="mcp-accessibility-$$"

# Check for VNC mode - always enable for browser viewing
VNC_MODE="${ENABLE_VNC:-true}"

# Use alternative ports if default ones are in use
VNC_PORT="${VNC_PORT:-5901}"
WEB_PORT="${WEB_PORT:-6081}"

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed" >&2
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running" >&2
    exit 1
fi

# Check if image exists, build if not
if ! docker image inspect "$IMAGE_NAME" &> /dev/null; then
    echo "Building Docker image..." >&2
    docker build -t "$IMAGE_NAME" "$(dirname "$0")" >&2
    if [ $? -ne 0 ]; then
        echo "Error: Failed to build Docker image" >&2
        exit 1
    fi
fi

# Create reports directory on host if it doesn't exist
REPORTS_DIR="$(dirname "$0")/reports"
mkdir -p "$REPORTS_DIR/accessibility-reports" "$REPORTS_DIR/test-reports"

# Prepare Docker run arguments
DOCKER_ARGS="-i --rm --name $CONTAINER_NAME --shm-size=1gb"

# Mount reports directory as volume
DOCKER_ARGS="$DOCKER_ARGS -v $REPORTS_DIR:/app/reports"

# Add VNC-specific options if enabled
if [ "$VNC_MODE" = "true" ]; then
    DOCKER_ARGS="$DOCKER_ARGS -e ENABLE_VNC=true -e DISPLAY=:99 -e FORCE_HEADED_BROWSER=true -p ${WEB_PORT}:6080 -p ${VNC_PORT}:5900"
    echo "VNC mode enabled. Browser viewer will be available at:" >&2
    echo "  http://localhost:${WEB_PORT}/vnc.html" >&2
    echo "  VNC port: ${VNC_PORT} (for VNC clients)" >&2
    echo "  Reports will be saved to: $REPORTS_DIR" >&2
else
    DOCKER_ARGS="$DOCKER_ARGS -e ENABLE_VNC=false -e DISPLAY=:99 -e FORCE_HEADED_BROWSER=true"
    echo "Reports will be saved to: $REPORTS_DIR" >&2
fi

# Run the container
exec docker run $DOCKER_ARGS "$IMAGE_NAME"
