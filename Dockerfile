FROM node:24-slim AS builder
WORKDIR /app

# Install native build tools for compiling Node modules (if needed for better-sqlite3 on some platforms)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy code and build Next.js bundle
COPY . .
RUN npm run build

# Production Runner Stage
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3030
ENV HOSTNAME="0.0.0.0"

# Copy build artifacts and dependencies from builder stage
COPY --from=builder /app ./

# Create data directory for SQLite persistence
RUN mkdir -p data

EXPOSE 3030

# Run database seeder first, then start server
CMD ["sh", "-c", "node src/lib/run-db-init.mjs && npm run start"]
