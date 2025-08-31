import { SQSClient } from "@aws-sdk/client-sqs";

import serverEnv from "../serverEnv";

const sqsClient = new SQSClient({
  region: serverEnv.paytrailStatementRegion,
  credentials: {
    accessKeyId: serverEnv.paytrailStatementSqsAccessKey,
    secretAccessKey: serverEnv.paytrailStatementSqsSecretKey,
  },
});

export default sqsClient;
