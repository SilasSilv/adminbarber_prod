FROM node:18-alpine
WORKDIR /app
# Instala dependências do Chromium (necessário para whatsapp-web.js)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY worker/package*.json ./
RUN npm install --omit=dev
COPY worker/src ./src
CMD ["node", "src/index.js"]