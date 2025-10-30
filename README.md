# Hedera Africa Hackathon Project

A blockchain-based messaging and rewards system built on the Hedera Hashgraph network, implementing HCS-10 (Hedera Consensus Service) for messaging and HCS-20 for tokenized reward points.

## Overview

This project demonstrates a decentralized communication and rewards system that leverages Hedera's Consensus Service (HCS) for message publishing/subscribing and HCS-20 standard for creating and transferring reward points. The system consists of a Node.js/Express backend with a React frontend.

## Features

- **HCS-10 Messaging**: Publish and subscribe to messages on Hedera Consensus Service topics
- **Message Forwarding**: Automatic forwarding of messages between source and target topics
- **HCS-20 Reward Points**: Create, mint, and transfer tokenized reward points
- **RESTful API**: Complete API endpoints for interacting with the Hedera network
- **Real-time Subscription**: Background subscriber service for message processing
- **Production Ready**: Configured for both development and production environments

## Project Structure

```
├── index.js              # Main Express server and API endpoints
├── publisher.js          # HCS-10 message publishing functionality
├── subscriber.js         # HCS-10 message subscription service
├── forwarder.js          # Message forwarding between topics
├── hcs20points.js        # HCS-20 reward points implementation
├── hederaClient.js       # Hedera client configuration and setup
├── package.json          # Project dependencies and scripts
├── .env.example          # Environment variables template
└── nginx.conf            # Nginx configuration for production
```

## Core Components

### 1. Express Server (`index.js`)
The main application server that provides REST API endpoints:
- `GET /api/health` - Health check and configuration status
- `POST /api/hcs/publish` - Publish messages to HCS topics
- `GET /api/hcs/messages` - Retrieve messages from HCS topics
- `POST /api/hcs/transferpoints` - Transfer reward points between accounts

### 2. HCS-10 Publisher (`publisher.js`)
Handles publishing JSON messages to Hedera Consensus Service topics:
- Uses the HCS10Client from the Hedera Standards SDK
- Supports both string and JSON payload formats
- Configured for Hedera testnet by default

### 3. HCS-10 Subscriber (`subscriber.js`)
Implements real-time message subscription:
- Listens to source topic for new messages
- Automatically forwards received messages to target topic
- Includes error handling and logging

### 4. Message Forwarder (`forwarder.js`)
Facilitates message forwarding between Hedera topics:
- Uses TopicMessageSubmitTransaction for secure message transfer
- Handles transaction execution and receipt verification

### 5. HCS-20 Points System (`hcs20points.js`)
Implements tokenized reward points using HCS-20 standard:
- Deploys reward point contracts with configurable parameters
- Mints new points to specified accounts
- Transfers points between accounts with memo support

### 6. Hedera Client (`hederaClient.js`)
Centralized Hedera network configuration:
- Manages client connection to Hedera testnet
- Handles operator credentials and topic IDs
- Provides configuration status validation

## Environment Configuration

Create a `.env` file based on `.env.example` with the following variables:

```env
VITE_OPERATOR_ID=your_hedera_account_id
VITE_OPERATOR_KEY=your_hedera_private_key
VITE_SOURCE_TOPIC_ID=your_source_topic_id
VITE_TARGET_TOPIC_ID=your_target_topic_id
VITE_TO_OPERATOR_ID=recipient_account_id
```

### Required Environment Variables

- `VITE_OPERATOR_ID`: Your Hedera account ID (operator)
- `VITE_OPERATOR_KEY`: Your Hedera private key (operator)
- `VITE_SOURCE_TOPIC_ID`: HCS topic ID for source messages
- `VITE_TARGET_TOPIC_ID`: HCS topic ID for target messages
- `VITE_TO_OPERATOR_ID`: Recipient account ID for point transfers

## Installation and Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Hedera testnet account with sufficient HBAR

### Installation Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd unthink-hedera-africa-hackathon
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Hedera credentials
```

4. Development mode:
```bash
# Run both backend and frontend concurrently
npm run dev

# Or run separately:
npm run dev:server  # Backend only
npm run dev:web     # Frontend only
```

5. Production build:
```bash
npm run build
npm run start
```

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and Hedera configuration status.

### Publish Message
```
POST /api/hcs/publish
Content-Type: application/json

{
  "email_id": "user@example.com",
  "message": "Your message content",
  "event_id": "event-123",
  "message_type": "notification"
}
```

### Get Messages
```
GET /api/hcs/messages
```
Retrieves all messages from the source topic.

### Transfer Points
```
POST /api/hcs/transferpoints
Content-Type: application/json

{
  "name": "User Name",
  "memo": "Reward for achievement",
  "amount": 100
}
```

## HCS-20 Points System

The project implements a complete HCS-20 token system for reward points:

### Point Deployment
- Token name: "RewardPoints"
- Token symbol: "MRP"
- Maximum supply: 1,000,000 points
- Mint limit per transaction: 1,000 points

### Point Operations
1. **Deploy**: Creates a new HCS-20 token contract
2. **Mint**: Issues new points to a specified account
3. **Transfer**: Moves points between accounts with memo support

## Technology Stack

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **Hedera SDK**: Official Hedera Hashgraph SDK
- **Hedera Standards SDK**: HCS-10 and HCS-20 implementations
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment variable management

## Development Scripts

- `npm run dev`: Run both backend and frontend in development mode
- `npm run dev:server`: Run backend server only
- `npm run dev:web`: Run frontend development server only
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run server`: Start backend server
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

## Production Deployment

The application is configured for production deployment with:

1. **Single Server Deployment**: Both frontend and API served from the same Express server
2. **Static File Serving**: Built React app served as static files
3. **React Router Support**: All routes fallback to index.html for SPA functionality
4. **Environment-based Configuration**: Different behavior for development vs production

### Nginx Configuration

The project includes an `nginx.conf` file for reverse proxy configuration in production environments.

### Common Issues

1. **Hedera Configuration Errors**:
   - Ensure all environment variables are set correctly
   - Verify your Hedera account has sufficient HBAR balance
   - Check that topic IDs are valid and accessible

2. **Message Publishing Failures**:
   - Verify topic permissions for your operator account
   - Check network connectivity to Hedera nodes
   - Review message size limits (currently 4KB)

3. **Point Transfer Issues**:
   - Ensure recipient account ID is valid
   - Verify sufficient point balance before transfers
   - Check memo field length constraints


