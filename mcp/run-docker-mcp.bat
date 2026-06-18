@echo off
REM MCP Accessibility Server Docker Runner for Windows (Batch version)
REM This script runs the MCP server in a Docker container
REM Use this script as the command in your Cursor MCP configuration
REM 
REM For browser viewing, run with ENABLE_VNC=true:
REM   set ENABLE_VNC=true && run-docker-mcp.bat
REM Then open http://localhost:6080/vnc.html in your browser

setlocal enabledelayedexpansion

REM Configuration
set IMAGE_NAME=mcp-accessibility:fixed
set CONTAINER_NAME=mcp-accessibility-%RANDOM%

REM Check for VNC mode - always enable for browser viewing
if not defined ENABLE_VNC set ENABLE_VNC=true
set VNC_MODE=%ENABLE_VNC%

REM Use alternative ports if default ones are in use
if not defined VNC_PORT set VNC_PORT=5901
if not defined WEB_PORT set WEB_PORT=6081

REM Check if Docker is installed
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker is not installed >&2
    exit /b 1
)

REM Check if Docker daemon is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker daemon is not running >&2
    exit /b 1
)

REM Check if image exists, build if not
docker image inspect %IMAGE_NAME% >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Building Docker image...
    docker build -t %IMAGE_NAME% "%~dp0"
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to build Docker image >&2
        exit /b 1
    )
)

REM Create reports directory on host if it doesn't exist
set REPORTS_DIR=%~dp0reports
if not exist "%REPORTS_DIR%\accessibility-reports" mkdir "%REPORTS_DIR%\accessibility-reports"
if not exist "%REPORTS_DIR%\test-reports" mkdir "%REPORTS_DIR%\test-reports"

REM Prepare Docker run arguments
set DOCKER_ARGS=-i --rm --name %CONTAINER_NAME% --shm-size=1gb

REM Mount reports directory as volume
set DOCKER_ARGS=%DOCKER_ARGS% -v "%REPORTS_DIR%:/app/reports"

REM Add VNC-specific options if enabled
if "%VNC_MODE%"=="true" (
    set DOCKER_ARGS=%DOCKER_ARGS% -e ENABLE_VNC=true -e DISPLAY=:99 -e FORCE_HEADED_BROWSER=true
    set DOCKER_ARGS=%DOCKER_ARGS% -p %WEB_PORT%:6080 -p %VNC_PORT%:5900
    echo VNC mode enabled. Browser viewer will be available at:
    echo   http://localhost:%WEB_PORT%/vnc.html
    echo   VNC port: %VNC_PORT% ^(for VNC clients^)
    echo   Reports will be saved to: %REPORTS_DIR%
) else (
    set DOCKER_ARGS=%DOCKER_ARGS% -e ENABLE_VNC=false -e DISPLAY=:99 -e FORCE_HEADED_BROWSER=true
    echo Reports will be saved to: %REPORTS_DIR%
)

REM Run the container
docker run %DOCKER_ARGS% %IMAGE_NAME%
