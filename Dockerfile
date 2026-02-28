# syntax = docker/dockerfile:1
# Node + Chromium for whatsapp-web.js (Puppeteer) on Fly.io

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app
ENV NODE_ENV=production

# Don't download Puppeteer's bundled Chromium; we use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install Chromium and minimal deps for headless Puppeteer
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Build stage
FROM base AS build
RUN apt-get update -qq && apt-get install -y --no-install-recommends build-essential node-gyp pkg-config python3
COPY package-lock.json package.json ./
RUN npm ci
COPY . .

# Final image
FROM base
COPY --from=build /app /app

EXPOSE 3000
CMD ["npm", "run", "start"]
