FROM node:20-alpine

WORKDIR /app

# Copy package.json and yarn.lock
COPY package*.json yarn.lock ./

# Install dependencies with yarn (faster parallel installation)
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Create storage and logs directories
RUN mkdir -p /app/storage /app/logs

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application with PM2
CMD ["yarn", "start"]