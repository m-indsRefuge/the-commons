import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL?.trim();

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/infrastructure/database/schema/auth.ts",
    "./src/infrastructure/database/schema/identity.ts",
  ],
  out: "./drizzle",
  strict: true,
  verbose: true,
  ...(databaseUrl
    ? {
        dbCredentials: {
          url: databaseUrl,
        },
      }
    : {}),
});
