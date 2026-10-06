export interface DatabaseEnvironment {
  DATABASE_URL: string;
}

export interface AuthEnvironment {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export interface IdentityEnvironment {
  INVITE_TOKEN_SECRET: string;
}

export interface ServerEnvironment
  extends DatabaseEnvironment,
    AuthEnvironment,
    IdentityEnvironment {}

function readRequiredEnvironment<K extends string>(
  keys: readonly K[],
  source: NodeJS.ProcessEnv,
): Record<K, string> {
  const missing = keys.filter((key) => !source[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(", ")}`,
    );
  }

  return Object.fromEntries(
    keys.map((key) => [key, source[key]!.trim()]),
  ) as Record<K, string>;
}

export function readDatabaseEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): DatabaseEnvironment {
  return readRequiredEnvironment(["DATABASE_URL"] as const, source);
}

export function readAuthEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): AuthEnvironment {
  return readRequiredEnvironment(
    [
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "GITHUB_CLIENT_ID",
      "GITHUB_CLIENT_SECRET",
    ] as const,
    source,
  );
}

export function readIdentityEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): IdentityEnvironment {
  return readRequiredEnvironment(["INVITE_TOKEN_SECRET"] as const, source);
}

export function readServerEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnvironment {
  return {
    ...readDatabaseEnvironment(source),
    ...readAuthEnvironment(source),
    ...readIdentityEnvironment(source),
  };
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
