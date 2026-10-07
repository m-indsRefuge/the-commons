import type { CommonsDatabase } from "../client";

export type CoreDomainExecutor = Pick<
  CommonsDatabase,
  "select" | "insert" | "update" | "delete"
>;

export async function withCoreDomainTransaction<T>(
  database: CommonsDatabase,
  operation: (executor: CoreDomainExecutor) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => operation(transaction));
}
