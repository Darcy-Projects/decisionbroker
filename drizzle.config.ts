import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load the same env file Next uses locally.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/infrastructure/db/drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
