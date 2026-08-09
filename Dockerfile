FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["npm", "run", "start"]
