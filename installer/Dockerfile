# Lightweight installer image
FROM node:18-alpine

WORKDIR /app

# Copy package files for installer
COPY package.json ./
RUN npm install --only=production

# Copy installer files
COPY public/ ./public/
COPY src/ ./src/
COPY . .

# Build the installer app
RUN npm run build

# Serve the installer
FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]