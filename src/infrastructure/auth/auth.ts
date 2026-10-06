import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import { getDatabase } from "@/infrastructure/database/client";
import * as authSchema from "@/infrastructure/database/schema/auth";
import { readServerEnvironment } from "@/infrastructure/config/env";

let authInstance: ReturnType<typeof betterAuth> | undefined;

export function getAuth(): ReturnType<typeof betterAuth> {
  if (authInstance) return authInstance;

  const env = readServerEnvironment();

  authInstance = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: authSchema,
    }),
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        disableDefaultScope: true,
        scope: ["read:user", "user:email"],
      },
    },
  });

  return authInstance;
}
