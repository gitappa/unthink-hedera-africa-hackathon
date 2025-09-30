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

ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_OPERATOR_ID
ARG VITE_OPERATOR_KEY
ARG VITE_SOURCE_TOPIC_ID
ARG VITE_TARGET_TOPIC_ID

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_OPERATOR_ID=$VITE_OPERATOR_ID
ENV VITE_OPERATOR_KEY=$VITE_OPERATOR_KEY
ENV VITE_SOURCE_TOPIC_ID=$VITE_SOURCE_TOPIC_ID
ENV VITE_TARGET_TOPIC_ID=$VITE_TARGET_TOPIC_ID

# Build the application
RUN npm run build

# Expose port 4173 (Vite preview default) 
# Cloud Run will map this to the PORT environment variable
EXPOSE 4173

# Use Vite's preview server to serve the built application
# The --host 0.0.0.0 allows external connections
# The --port 4173 sets the port (Cloud Run will override with PORT env var)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]