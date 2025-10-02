# Voygent v2 - Production LibreChat Dockerfile
# Optimized for Render.com deployment with MCP integration

FROM ghcr.io/danny-avila/librechat-dev:latest

LABEL maintainer="Voygent Team"
LABEL description="LibreChat with MCP servers for travel planning"

# Set working directory
WORKDIR /app

# Copy LibreChat configuration
COPY config/librechat.yaml /app/librechat.yaml

# Copy analytics middleware and services
COPY server/middleware/ /app/server/middleware/
COPY server/services/ /app/server/services/
COPY server/inject-analytics.js /app/server/inject-analytics.js
COPY server/start-with-analytics.js /app/server/start-with-analytics.js

# Create directories for uploads and logs
RUN mkdir -p /app/client/public/images/uploads /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3080/api/health', (r) => { \
    if (r.statusCode === 200) { process.exit(0); } else { process.exit(1); } \
  }).on('error', () => process.exit(1));"

# Expose port
EXPOSE 3080

# Switch to non-root user
USER node

# Start LibreChat with analytics wrapper
CMD ["node", "/app/server/start-with-analytics.js"]
