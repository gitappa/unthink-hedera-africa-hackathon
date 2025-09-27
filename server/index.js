import express from 'express';
import dotenv from 'dotenv';
import { publishJson } from './publisher.js';
import { startSubscription } from './subscriber.js';

dotenv.config();

const app = express();
app.use(express.json());

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

const port = process.env.PORT || 5174;
app.listen(port, () => {
  console.log(`HCS API listening on :${port}`);
});

// Optional: start forwarding worker
if (process.env.START_SUBSCRIBER === 'true') {
  startSubscription();
}


