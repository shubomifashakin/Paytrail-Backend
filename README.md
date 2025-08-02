# Express Starter Kit

This is a simple express.js starter kit, featuring authentication, logging, caching, rate limiting, mailing and many more.

## Prerequisites

- Node.js v18+
- Docker & Docker Compose (optional, but if you want to spin up a local database & a cache, good to have)
- Google Oauth Credentials
- Resend Account for Mailing

## Project Structure

```
prisma/
├── migrations/
├── schema.prisma
src/
├── controllers/
├── lib/
├── middlewares/
├── routes/
├── serverEnv/
├── test/
├── types/
├── utils/
├── validators/
├── server.ts
```

## Stack

- `Typescript` as the language
- `Express v5.1.0` for the server
- `Prisma v6.12.0` for database
- `Resend` for mailing
- `Better Auth v1.3.3` for authentication
- `Redis v5.6.0` for caching
- `Jest v30.0.4` & `supertest` for testing
- `Winston v3.17.0` with `OpenTelemetry transport` for centralized logging (SigNoz)
- `Zod v4.0.5` for validation
- `Express-rate-limit v8.0.1` for rate limiting
- `Multer v2.0.2` as middleware for file uploads
- `Rate-limit-redis v4.2.1` as the store for rate limiting

## Installation

1. Clone the repository

   ```
   git clone <repository-url>
   cd express-starter-kit
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Create a `.env` file with the following variables

   ```
   PORT=your-port
   REDIS_URL=your-redis-url
   DATABASE_URL=your-database-url
   BETTER_AUTH_SECRET_KEY=your-secret-key
   BETTER_AUTH_URL=your-better-auth-url
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   RESEND_KEY=your-resend-key
   NODE_ENV=your-environment
   OTEL_EXPORTER_OTLP_ENDPOINT=your-otel-endpoint
   SIGNOZ_INGESTION_KEY=your-signoz-ingestion-key
   LOG_LEVEL=your-log-level
   SERVICE_NAME=your-service-name
   ```

4. Database Setup

   ```
   npx prisma migrate dev
   npx prisma generate
   ```

5. Start the server
   ```
   npm run dev
   ```

## Notes

- Please adjust the jest configuration to suit your needs. Change the `displayName` to your project name
