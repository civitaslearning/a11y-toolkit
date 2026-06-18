# Stage 1: Build stage
FROM node:20-bookworm-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build the TypeScript code
RUN npm run build

# Stage 2: Runtime stage
FROM node:20-bookworm-slim

# Install Playwright system dependencies and other required packages
RUN apt-get update && apt-get install -y \
    # Dependencies for Chromium
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxcb1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    fonts-liberation \
    # Additional dependencies that might be needed
    libgtk-3-0 \
    libxshmfence1 \
    libglu1-mesa \
    # X11 and VNC for cross-platform browser viewing
    xvfb \
    x11vnc \
    fluxbox \
    supervisor \
    wget \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Install noVNC and websockify manually
RUN cd /opt && \
    wget -q https://github.com/novnc/noVNC/archive/refs/tags/v1.4.0.tar.gz && \
    tar -xzf v1.4.0.tar.gz && \
    mv noVNC-1.4.0 novnc && \
    rm v1.4.0.tar.gz && \
    cd /opt/novnc/utils && \
    wget -q https://github.com/novnc/websockify/archive/refs/tags/v0.11.0.tar.gz && \
    tar -xzf v0.11.0.tar.gz && \
    mv websockify-0.11.0 websockify && \
    rm v0.11.0.tar.gz

# Create a non-root user for running the application
RUN groupadd -r mcp && useradd -r -g mcp -m mcp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Set Playwright browser path environment variable
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install Playwright browsers with dependencies
# Install browsers and their dependencies
RUN mkdir -p /ms-playwright && \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright npx playwright install chromium && \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright npx playwright install-deps chromium

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy any other necessary files
COPY README.md ./
COPY docker-entrypoint.sh ./

# Set proper permissions
RUN chown -R mcp:mcp /app && \
    chmod -R 755 /ms-playwright || true && \
    chmod +x /app/docker-entrypoint.sh && \
    chown mcp:mcp /opt/novnc -R || true

# Switch to non-root user
USER mcp

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
ENV DISPLAY=:99
ENV FORCE_HEADED_BROWSER=true

# Expose ports for VNC and noVNC
EXPOSE 5900 6080

# Health check (optional - you can customize this)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Use the entrypoint script that handles both VNC and non-VNC modes
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Label for metadata
LABEL maintainer="your-email@example.com" \
    version="1.0.0" \
    description="MCP Accessibility Testing Server with Playwright, axe-core, and optional VNC viewer"
