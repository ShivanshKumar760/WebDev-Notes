FROM node:18-alpine

WORKDIR /app

# Install docker CLI
RUN apk add --no-cache docker-cli

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "src/server.js"]
