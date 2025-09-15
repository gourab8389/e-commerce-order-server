FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3002

CMD ["npm", "start"]