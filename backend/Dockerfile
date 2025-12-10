# Builder stage
FROM rust:1.83-slim-bookworm as builder

WORKDIR /app

# Install dependencies needed for compilation (e.g. OpenSSL)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Create a dummy project to cache dependencies
RUN cargo new --bin backend
WORKDIR /app/backend

# Copy manifests
COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml

# Build dependencies (this layer will be cached if manifests don't change)
RUN cargo build --release
RUN rm src/*.rs

# Copy source code
COPY ./src ./src
COPY ./.sqlx ./.sqlx
COPY ./migrations ./migrations

# Build the actual application
# Use SQLX_OFFLINE=true to use the cached .sqlx directory instead of connecting to a live DB
ENV SQLX_OFFLINE=true
RUN rm ./target/release/deps/agreed_time*
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies (OpenSSL, ca-certificates for HTTPS)
RUN apt-get update && apt-get install -y libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the binary from the builder
COPY --from=builder /app/backend/target/release/agreed-time-backend /app/server

# Expose the port
EXPOSE 3000

# Run the binary
CMD ["/app/server"]
