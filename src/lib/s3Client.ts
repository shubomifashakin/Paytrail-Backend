import { S3Client } from "@aws-sdk/client-s3";

import serverEnv from "../serverEnv";

const s3Client = new S3Client({
  region: serverEnv.paytrailAWSRegion,
  credentials: {
    accessKeyId: serverEnv.paytrailAWSAccessKey,
    secretAccessKey: serverEnv.paytrailAWSSecretKey,
  },
});

export default s3Client;
