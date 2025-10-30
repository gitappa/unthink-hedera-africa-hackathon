import { HCS20Client } from '@hashgraphonline/standards-sdk';
//import "dotenv/config";


const client = new HCS20Client({
  network: 'testnet',
  operatorId: process.env.VITE_OPERATOR_ID,
  operatorKey: process.env.VITE_OPERATOR_KEY,
  logLevel: 'info',
});



// // Transfer points function
export async function transferpoints(name, memo, amount) {
  try {
    // Validate input parameters
    if (!name || !memo || amount === undefined || amount === null) {
      throw new Error(`Invalid parameters: name=${name}, memo=${memo}, amount=${amount}`);
    }
    
    // Validate environment variables
    const operatorId = process.env.VITE_OPERATOR_ID;
    const toOperatorId = process.env.VITE_TO_OPERATOR_ID;
    
    if (!operatorId) {
      throw new Error('VITE_OPERATOR_ID environment variable is not set');
    }
    
    if (!toOperatorId) {
      throw new Error('VITE_TO_OPERATOR_ID environment variable is not set');
    }
    
    console.log('Starting points transfer with parameters:', { name, memo, amount, operatorId, toOperatorId });
    
    const deployOptions = {
      name: 'RewardPoints',
      tick: 'MRP',
      maxSupply: '1000000',
      limitPerMint: '1000',
      usePrivateTopic: true,
      progressCallback: d => console.log(`${d.stage}: ${d.percentage}%`),
    };
    const pointsInfo = await client.deployPoints(deployOptions);
    
    const mintOptions = {
      tick: 'MRP',
      amount: amount.toString(),
      to: operatorId,      // recipient Hedera account ID
      memo: 'Initial points for user',
      topicId: pointsInfo.topicId,
      progressCallback: (data) => {
        console.log(`${data.stage}: ${data.percentage}%`);
      }
    };
    const mintTransaction = await client.mintPoints(mintOptions);
    const transferOptions = {
      tick: 'MRP',
      amount: amount.toString(),
      from: operatorId,    // sender account
      to: toOperatorId,    // recipient account (using name parameter)
      memo: memo,          // memo from parameter
      topicId: mintTransaction.topicId,
      progressCallback: (data) => {
        console.log(`${data.stage}: ${data.percentage}%`);
      }
    };
    
    const transferTransaction = await client.transferPoints(transferOptions);
    return transferTransaction.topicId;
  } catch (error) {
    console.error('Error transferring points:', error);
    throw error;
  }
}
