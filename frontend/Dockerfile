# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (context is project root, so use frontend/ prefix)
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ .

# Accept build argument for API URL
ARG PUBLIC_API_BASE_URL=https://api.agreedtime.com

# Create .env.production file with the build arg
RUN echo "PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}" > .env.production

# Build static files
RUN npm run build

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration for SPA routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
