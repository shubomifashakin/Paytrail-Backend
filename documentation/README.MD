# Paytrail Backend Documentation

Welcome to the documentation directory for the Paytrail Backend API. This folder contains architectural decisions, API specifications, and supporting materials to help developers understand, use, and contribute to the backend system effectively.

---

## Structure Overview

### `ADRs/`

Contains **Architecture Decision Records** that document key technical and design choices made during the development of the backend. Each ADR answers the "why" behind major decisions.

- Format: Markdown files
- Naming convention: `NNN-title.md` (e.g., `001-use-postgres.md`)

### `openApi/`

Holds the **OpenAPI specification** for the Paytrail API.

- `spec.yaml`: Main API spec file (OpenAPI 3.0.3)
- Used to generate Swagger UI, or other API documentation tools
- Includes security schemes, endpoints, schemas, and server definitions

---

## Usage

### View API Docs Locally

To view the OpenAPI spec in Swagger UI:

1. Start the backend server locally.
2. Ensure Swagger UI is mounted (only in development).
3. Visit: `http://localhost:3000/api-docs`

### Generate Static Docs

You can generate static documentation using [Redoc CLI](https://github.com/Redocly/redoc):

```bash
npx redoc-cli bundle openApi/v1/spec.yaml -o openApi/v1/spec.html
```
