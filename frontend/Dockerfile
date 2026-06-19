# Multi-stage Dockerfile for React + Vite + Nginx
# Build: docker build -t vms-frontend .
# Run: docker run -p 80:80 vms-frontend

# =============================================================================
# Stage 1: Build
# =============================================================================
FROM node:22-alpine AS build
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build arguments
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build \
    && test -f dist/index.html \
    && ls -la dist/

# =============================================================================
# Stage 2: Production Nginx
# =============================================================================
FROM nginx:1.27-alpine AS runner

# Install envsubst for template rendering
RUN apk add --no-cache gettext

# Copy nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Official nginx:alpine image already ships nginx user/group (uid/gid 101)
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Render template using env vars then start nginx
CMD ["/bin/sh", "-lc", "envsubst '$$API_PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]