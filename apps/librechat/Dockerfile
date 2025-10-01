# Voygent v2 - Production LibreChat Dockerfile
# Optimized for Render.com deployment with MCP integration

FROM ghcr.io/danny-avila/librechat-dev:latest

LABEL maintainer="Voygent Team"
LABEL description="LibreChat with MCP servers for travel planning"

# Set working directory
WORKDIR /app

# Copy LibreChat configuration
COPY config/librechat.yaml /app/librechat.yaml

# Ensure LibreChat config is readable
RUN chmod 644 /app/librechat.yaml

# Create directories for uploads and logs
RUN mkdir -p /app/client/public/images/uploads /app/logs && \
    chown -R node:node /app/client/public/images/uploads /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3080/api/health', (r) => { \
    if (r.statusCode === 200) { process.exit(0); } else { process.exit(1); } \
  }).on('error', () => process.exit(1));"

# Expose port
EXPOSE 3080

# Switch to non-root user
USER node

# Start LibreChat
CMD ["npm", "run", "backend"]
