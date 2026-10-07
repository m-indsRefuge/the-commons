export type CoreDomainPersistenceErrorCode = "CONFLICT" | "MISSING_REFERENCE";

export class CoreDomainPersistenceError extends Error {
  constructor(
    readonly code: CoreDomainPersistenceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CoreDomainPersistenceError";
  }
}

function findPostgresCode(error: unknown): string | null {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== "object" || current === null) return null;
    if ("code" in current && typeof current.code === "string") {
      return current.code;
    }
    current = "cause" in current ? current.cause : null;
  }
  return null;
}

export async function withCoreDomainPersistenceErrors<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const code = findPostgresCode(error);
    if (code === "23505") {
      throw new CoreDomainPersistenceError(
        "CONFLICT",
        "Core Domain unique value already exists.",
        { cause: error },
      );
    }
    if (code === "23503") {
      throw new CoreDomainPersistenceError(
        "MISSING_REFERENCE",
        "Core Domain reference does not exist.",
        { cause: error },
      );
    }
    throw error;
  }
}
