import { SQSClient } from "@aws-sdk/client-sqs";
import serverEnv from "../serverEnv";

const sqsClient = new SQSClient({
  region: serverEnv.paytrailAWSRegion,
  credentials: {
    accessKeyId: serverEnv.paytrailAWSAccessKey,
    secretAccessKey: serverEnv.paytrailAWSSecretKey,
  },
});

export default sqsClient;
