import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import serverEnv from "../serverEnv";

const dynamo = new DynamoDBClient({
  region: serverEnv.paytrailAWSRegion,
  credentials: {
    accessKeyId: serverEnv.paytrailAWSAccessKey,
    secretAccessKey: serverEnv.paytrailAWSSecretKey,
  },
});

const dynamoClient = DynamoDBDocumentClient.from(dynamo);

export default dynamoClient;
