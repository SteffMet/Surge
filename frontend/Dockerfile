# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Accept build arguments
ARG REACT_APP_API_URL=http://localhost:3000/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Copy package.json and yarn.lock
COPY package*.json yarn.lock ./

# Install dependencies with yarn (faster parallel installation)
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM nginx:alpine

# Copy the build output to replace the default nginx contents
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config to handle React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]