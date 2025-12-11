FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
npm install --production
COPY . .
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]
