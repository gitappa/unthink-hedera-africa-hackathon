# Use an official Node.js LTS image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci || npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Expose port 4173 (Vite preview default) 
# Cloud Run will map this to the PORT environment variable
EXPOSE 4173

# Use Vite's preview server to serve the built application
# The --host 0.0.0.0 allows external connections
# The --port 4173 sets the port (Cloud Run will override with PORT env var)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]