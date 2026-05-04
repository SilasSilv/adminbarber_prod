FROM node:18-alpine
WORKDIR /app
COPY api/package*.json ./
RUN npm install
COPY api/src ./src
EXPOSE 3000
CMD ["node", "src/server.js"]