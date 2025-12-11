#!/bin/bash
set -e

echo "Starting SQLx preparation..."

# Install dependencies
echo "Installing system dependencies..."
apt-get update
apt-get install -y build-essential pkg-config libssl-dev ca-certificates curl

# Install sqlx-cli
echo "Installing sqlx-cli..."
cargo install sqlx-cli --no-default-features --features postgres --locked

# Run prepare
echo "Running cargo sqlx prepare..."
cargo sqlx prepare -- --bin agreed-time-backend

echo "SQLx preparation completed successfully!"
