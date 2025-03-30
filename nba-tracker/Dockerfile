# frontend/Dockerfile
FROM node:18

WORKDIR /src

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Optional: serve the built frontend
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
