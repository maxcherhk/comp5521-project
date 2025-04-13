FROM node:20-alpine

WORKDIR /app

# Install basic tools and Python for any build requirements
RUN apk add --no-cache bash git python3 make g++ gettext

# Install global dependencies
RUN npm install -g npm@latest

# Set environment variables
ENV NODE_ENV=development

# Define ARG for build target (frontend or hardhat)
ARG BUILD_TARGET=all

# Copy package files for installation
COPY . .

# Setup for frontend
RUN if [ "$BUILD_TARGET" = "frontend" ] || [ "$BUILD_TARGET" = "all" ]; then \
    cd frontend && npm install; \
    fi

# Setup for hardhat
RUN if [ "$BUILD_TARGET" = "hardhat" ] || [ "$BUILD_TARGET" = "all" ]; then \
    cd hardhat && npm install; \
    fi

# Default command (will be overridden in docker-compose)
CMD ["bash"]