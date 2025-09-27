import { Client } from "@hashgraph/sdk";
// import dotenv from "dotenv";

// dotenv.config();

// if (!process.env.OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.SOURCE_TOPIC_ID || !process.env.TARGET_TOPIC_ID) {
//   throw new Error("Environment variables OPERATOR_ID, OPERATOR_KEY, SOURCE_TOPIC_ID, and TARGET_TOPIC_ID must be present");
// }

// const client = Client.forTestnet();
// client.setOperator(process.env.OPERATOR_ID, process.env.OPERATOR_KEY);

// export const hederaClient = client;
// export const sourceTopicId = process.env.SOURCE_TOPIC_ID;
// export const targetTopicId = process.env.TARGET_TOPIC_ID;


const client = Client.forTestnet();
client.setOperator("0.0.5999295","302e020100300506032b6570042204201d239feb4d1ecff6be046e65449034785c00c515187c33768b92b5d3d3dd1f34");

export const hederaClient = client;
export const sourceTopicId = "0.0.5999297";
export const targetTopicId = "0.0.5962822";
