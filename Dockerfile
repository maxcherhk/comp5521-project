FROM node:22-slim

WORKDIR /app
# Set environment variables from .env file
ARG TEST_WALLET_ADDRESS
ARG STRIPE_SECRET_KEY
ENV TEST_WALLET_ADDRESS=$TEST_WALLET_ADDRESS
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY

# Install system dependencies
RUN apt-get update && \
    apt-get install -y build-essential python3 curl git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY frontend/package*.json ./frontend/
COPY hardhat/package*.json ./hardhat/

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Install hardhat dependencies
WORKDIR /app/hardhat
RUN npm install

# Copy the rest of the application
WORKDIR /app
# Exclude .git directory during copy
RUN echo ".git" > .dockerignore
COPY . .

# Expose ports
EXPOSE 3000 8545

# Setup startup script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app
ENTRYPOINT ["/entrypoint.sh"]