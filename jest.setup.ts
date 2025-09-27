process.env.NODE_ENV = "production";
import dotenv from "dotenv";

// Force dotenv to load the .env.test file
dotenv.config({ path: ".env.test" });
