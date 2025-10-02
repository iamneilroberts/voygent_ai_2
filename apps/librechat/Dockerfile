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

# Copy core instructions configuration
COPY config/core-instructions.md /app/config/core-instructions.md

# Copy core instructions feature files (frontend)
COPY client/src/types/coreInstructions.ts /app/client/src/types/coreInstructions.ts
COPY client/src/services/CoreInstructionsService.ts /app/client/src/services/CoreInstructionsService.ts
COPY client/src/utils/storageAdapter.ts /app/client/src/utils/storageAdapter.ts
COPY client/src/utils/instructionToasts.ts /app/client/src/utils/instructionToasts.ts
COPY client/src/hooks/useCoreInstructions.ts /app/client/src/hooks/useCoreInstructions.ts
COPY client/src/commands/voygentCommand.ts /app/client/src/commands/voygentCommand.ts

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
