import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 5000,
    timeout: 15000, //TODO:use your own configuration
  },
});

export default prisma;
