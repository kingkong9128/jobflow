FROM node:20-alpine

WORKDIR /app

RUN npm install -g prisma

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY backend ./backend
RUN cd backend && npm install && prisma generate

COPY frontend ./frontend
RUN cd frontend && npm install

EXPOSE 3001

WORKDIR /app/backend
CMD ["sh", "-c", "npx prisma db push && npm run dev"]