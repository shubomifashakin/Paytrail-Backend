import { SNSClient } from "@aws-sdk/client-sns";

import serverEnv from "../serverEnv";

const snsClient = new SNSClient({
  region: serverEnv.paytrailAWSRegion,
  credentials: {
    accessKeyId: serverEnv.paytrailAWSAccessKey,
    secretAccessKey: serverEnv.paytrailAWSSecretKey,
  },
});

export default snsClient;
