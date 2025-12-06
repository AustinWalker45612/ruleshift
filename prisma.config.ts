// prisma.config.ts
import { defineConfig, env } from "@prisma/config";
import "dotenv/config";

export default defineConfig({
  // Path to your schema file
  schema: "prisma/schema.prisma",

  // Where migrations will be stored
  migrations: {
    path: "prisma/migrations",
  },

  // Database connection URL now lives here
  datasource: {
    url: env("DATABASE_URL"),
  },
});

