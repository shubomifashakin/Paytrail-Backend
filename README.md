# Paytrail Backend API

A type-safe backend service for the Paytrail application, built with TypeScript and Express.js. This API powers the core functionality of Paytrail, handling user authentication, data persistence, and business logic.

## Project Structure

### Core Directories

- [src/](src) - Main application source code
  - `controllers/` - Request handlers for API endpoints
  - `lib/` - Shared libraries and utilities
  - `middlewares/` - Express middleware functions
  - `routes/` - Route definitions and API endpoints
  - `serverEnv/` - Environment configuration
  - `test/` - Test suites and test utilities
  - `types/` - TypeScript type definitions
  - `utils/` - Helper functions and utilities
  - `app.ts` - Express application setup
  - `server.ts` - Server entry point
  - `dockerfile` - Dockerfile for building an application image

### Database

- [prisma/](prisma)
  - `migrations/` - Database migration files
  - `schema.prisma` - Prisma schema definition

### Documentation

- [documentation/](documentation)
  - [ADRs/](documentation/ADRs) - Architecture Decision Records
  - [openApi/](documentation/openApi) - OpenAPI/Swagger specifications
    - `api-spec.yaml` - Main API specification
  - [README.md](documentation/README.md) - Documentation guidelines

### Ops

- [ops/](ops) - Operational Files and Configs used for deployment
  - `docker-compose.yml` - Docker Compose configuration
  - `redis.conf` - Redis configuration file

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- PostgreSQL 17+
- Redis (for caching and rate limiting)
- Docker & Docker Compose

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server
   ```bash
   npm run dev
   ```
