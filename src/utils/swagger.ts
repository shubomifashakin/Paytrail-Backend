import { Express } from "express";

import fs from "fs";
import yaml from "js-yaml";

import swaggerUi from "swagger-ui-express";

const openApiYaml = fs.readFileSync("./documentation/openApi/v1/spec.yaml", "utf8");
const swaggerSpec = yaml.load(openApiYaml, { json: true }) as swaggerUi.JsonObject;

export default function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  console.log(`Swagger docs available at /api-docs`);
}
