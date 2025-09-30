import express from 'express';
import { publishJson } from './publisher.js';
import { startSubscription } from './subscriber.js';
import { HCS10Client } from '@hashgraphonline/standards-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

// import dotenv from 'dotenv';
// dotenv.config();

if (!process.env.VITE_OPERATOR_ID || !process.env.VITE_OPERATOR_KEY || !process.env.VITE_SOURCE_TOPIC_ID || !process.env.VITE_TARGET_TOPIC_ID) {
  throw new Error("Environment variables OPERATOR_ID, OPERATOR_KEY, SOURCE_TOPIC_ID, and TARGET_TOPIC_ID must be present");
}

// Initialize HCS10Client on server side
const hcsClient = new HCS10Client({
  network: 'testnet',
  operatorId: process.env.VITE_OPERATOR_ID || '',
  operatorPrivateKey: process.env.VITE_OPERATOR_KEY || '',
  logLevel: 'info',
});

const app = express();
app.use(express.json());

// Serve static files from Vite build output when running in Cloud Run/production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distDir));

app.post('/api/hcs/publish', async (req, res) => {
  try {
    const { email, message, eventId } = req.body || {};
    if (!email || !message || !eventId) {
      return res.status(400).json({ status: 'error', message: 'email, message, and eventId are required' });
    }
    console.log('[API] /api/hcs/publish received', { email, message, eventId });
    await publishJson({ email, message, eventId });
    console.log('[API] Published to SOURCE_TOPIC_ID');
    res.json({ status: 'success' });
  } catch (e) {
    console.error('Publish error:', e);
    res.status(500).json({ status: 'error', message: 'failed to publish' });
  }
});

app.get('/api/hcs/messages', async (req, res) => {
  try {
    const topicId = process.env.VITE_SOURCE_TOPIC_ID || '';
    if (!topicId) {
      return res.status(400).json({ status: 'error', message: 'SOURCE_TOPIC_ID not configured' });
    }

    const { messages } = await hcsClient.getMessages(topicId);
    console.log('[API] /api/hcs/messages returned', messages.length, 'messages');
    res.json({ status: 'success', messages });
  } catch (e) {
    console.error('Get messages error:', e);
    res.status(500).json({ status: 'error', message: 'failed to get messages' });
  }
});

// SPA fallback to index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on :${port}`);
});

// Optional: start forwarding worker
if (process.env.START_SUBSCRIBER === 'true') {
  startSubscription();
}


