# frontend/Dockerfile
FROM node:18

WORKDIR /src

COPY package*.json ./
RUN npm install

# Expose Vite dev server port
EXPOSE 3000

# Run Vite dev server for hot reloading
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
