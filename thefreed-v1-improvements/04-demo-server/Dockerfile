FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm ci || npm install --only=production
COPY .. ./
EXPOSE 3000
CMD ["npm","start"]
