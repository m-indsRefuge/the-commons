export interface ServerEnvironment {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  INVITE_TOKEN_SECRET: string;
}

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "INVITE_TOKEN_SECRET",
] as const;

export function readServerEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnvironment {
  const missing = REQUIRED_KEYS.filter((key) => !source[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(", ")}`,
    );
  }

  return Object.fromEntries(
    REQUIRED_KEYS.map((key) => [key, source[key]!.trim()]),
  ) as unknown as ServerEnvironment;
}

export function redactDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.username) url.username = "***";
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return "[redacted-invalid-database-url]";
  }
}
