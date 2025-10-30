import { sourceTopicId } from "./hederaClient.js";

import { HCS10Client } from '@hashgraphonline/standards-sdk';
import "dotenv/config";
// Basic configuration
const client = new HCS10Client({
  network: 'testnet', // Network: 'testnet' or 'mainnet'
  operatorId: process.env.VITE_OPERATOR_ID, // Your Hedera account ID
  operatorPrivateKey: process.env.VITE_OPERATOR_KEY, // Your Hedera private key
  logLevel: 'info',
});

export async function publishJson(jsonPayload) {
  const message = typeof jsonPayload === 'string' ? jsonPayload : JSON.stringify(jsonPayload);
  console.log('[Publisher] Publishing to source topic', { message });
  await client.sendMessage(
    sourceTopicId, 
    message, 
  );
  console.log('[Publisher] Publish receipt received');
}
