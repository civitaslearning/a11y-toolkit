# MCP Accessibility Server Docker Runner for Windows
# This script runs the MCP server in a Docker container
# Use this script as the command in your Cursor MCP configuration
# 
# For browser viewing, run with ENABLE_VNC=true:
#   $env:ENABLE_VNC="true"; .\run-docker-mcp.ps1
# Then open http://localhost:6080/vnc.html in your browser

# Configuration
$IMAGE_NAME = "mcp-accessibility:fixed"
$CONTAINER_NAME = "mcp-accessibility-$PID"

# Check for VNC mode - always enable for browser viewing
$VNC_MODE = if ($env:ENABLE_VNC) { $env:ENABLE_VNC } else { "true" }

# Use alternative ports if default ones are in use
$VNC_PORT = if ($env:VNC_PORT) { $env:VNC_PORT } else { "5901" }
$WEB_PORT = if ($env:WEB_PORT) { $env:WEB_PORT } else { "6081" }

# Check if Docker is installed
try {
    $dockerVersion = docker --version 2>$null
    if (-not $dockerVersion) {
        Write-Error "Error: Docker is not installed"
        exit 1
    }
} catch {
    Write-Error "Error: Docker is not installed"
    exit 1
}

# Check if Docker daemon is running
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error: Docker daemon is not running"
        exit 1
    }
} catch {
    Write-Error "Error: Docker daemon is not running"
    exit 1
}

# Check if image exists, build if not
$imageExists = docker image inspect $IMAGE_NAME 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Building Docker image..." -ForegroundColor Yellow
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    docker build -t $IMAGE_NAME $scriptDir
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error: Failed to build Docker image"
        exit 1
    }
}

# Create reports directory on host if it doesn't exist
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$REPORTS_DIR = Join-Path $scriptDir "reports"
$accessibilityReportsDir = Join-Path $REPORTS_DIR "accessibility-reports"
$testReportsDir = Join-Path $REPORTS_DIR "test-reports"

if (!(Test-Path $accessibilityReportsDir)) {
    New-Item -ItemType Directory -Force -Path $accessibilityReportsDir | Out-Null
}
if (!(Test-Path $testReportsDir)) {
    New-Item -ItemType Directory -Force -Path $testReportsDir | Out-Null
}

# Prepare Docker run arguments
$DOCKER_ARGS = @("-i", "--rm", "--name", $CONTAINER_NAME, "--shm-size=1gb")

# Mount reports directory as volume (convert Windows path to Docker format)
$dockerReportsPath = $REPORTS_DIR -replace '\\', '/'
if ($dockerReportsPath -match '^([A-Za-z]):(.*)') {
    # Convert C:\path to /c/path format for Docker on Windows
    $driveLetter = $Matches[1].ToLower()
    $pathPart = $Matches[2]
    $dockerReportsPath = "/$driveLetter$pathPart"
}
$DOCKER_ARGS += @("-v", "${dockerReportsPath}:/app/reports")

# Add VNC-specific options if enabled
if ($VNC_MODE -eq "true") {
    $DOCKER_ARGS += @(
        "-e", "ENABLE_VNC=true",
        "-e", "DISPLAY=:99",
        "-e", "FORCE_HEADED_BROWSER=true",
        "-p", "${WEB_PORT}:6080",
        "-p", "${VNC_PORT}:5900"
    )
    Write-Host "VNC mode enabled. Browser viewer will be available at:" -ForegroundColor Green
    Write-Host "  http://localhost:${WEB_PORT}/vnc.html" -ForegroundColor Cyan
    Write-Host "  VNC port: ${VNC_PORT} (for VNC clients)" -ForegroundColor Cyan
    Write-Host "  Reports will be saved to: $REPORTS_DIR" -ForegroundColor Cyan
} else {
    $DOCKER_ARGS += @(
        "-e", "ENABLE_VNC=false",
        "-e", "DISPLAY=:99",
        "-e", "FORCE_HEADED_BROWSER=true"
    )
    Write-Host "Reports will be saved to: $REPORTS_DIR" -ForegroundColor Cyan
}

# Run the container
& docker run $DOCKER_ARGS $IMAGE_NAME
