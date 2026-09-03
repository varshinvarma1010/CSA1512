# =========================================================================
# Dockerfile - Cloud-Ready Smart Campus Service Platform
# Assignment: CSA15 Cloud Computing and Big Data Analytics
# =========================================================================

# Use lightweight official Node.js Alpine base image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy entire application source code
COPY . .

# Expose standard application port
EXPOSE 3000

# Set environment variable defaults
ENV PORT=3000
ENV NODE_ENV=production

# Healthcheck for cloud container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start Node.js Express server
CMD ["node", "server.js"]
