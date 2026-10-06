import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { readServerEnvironment } from "@/infrastructure/config/env";
import * as schema from "./schema";

export type CommonsDatabase = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let database: CommonsDatabase | undefined;

export function getDatabase(): CommonsDatabase {
  if (database) return database;

  const env = readServerEnvironment();

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
  });

  database = drizzle(pool, { schema });
  return database;
}

export async function closeDatabase(): Promise<void> {
  await pool?.end();
  pool = undefined;
  database = undefined;
}
