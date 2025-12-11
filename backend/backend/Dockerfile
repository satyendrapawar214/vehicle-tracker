FROM node:18-alpine AS builder

# 1) Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# 2) Build backend
FROM node:18-alpine

WORKDIR /app

# Copy backend source
COPY backend/package*.json ./
RUN npm install

COPY backend/ .

# Copy frontend build to backend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 4000

CMD ["node", "src/index.js"]
