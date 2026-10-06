import process from "node:process";

import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL?.trim();
const authUserId = process.env.BOOTSTRAP_AUTH_USER_ID?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (!authUserId) {
  throw new Error("BOOTSTRAP_AUTH_USER_ID is required.");
}

const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query("BEGIN");

  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    "the-commons:first-admin-bootstrap",
  ]);

  const membershipCount = await client.query(
    'SELECT count(*)::int AS "count" FROM "commons_membership"',
  );

  if (membershipCount.rows[0]?.count !== 0) {
    throw new Error(
      "First-admin bootstrap refused: Commons memberships already exist.",
    );
  }

  const authUser = await client.query(
    'SELECT "id" FROM "user" WHERE "id" = $1',
    [authUserId],
  );

  if (authUser.rowCount !== 1) {
    throw new Error(
      "First-admin bootstrap refused: Better Auth user does not exist.",
    );
  }

  const membership = await client.query(
    `INSERT INTO "commons_membership"
      ("auth_user_id", "status", "role", "admitted_at")
     VALUES ($1, 'ACTIVE', 'ADMIN', now())
     RETURNING "id"`,
    [authUserId],
  );

  const membershipId = membership.rows[0]?.id;
  if (!membershipId) {
    throw new Error("First-admin bootstrap did not return a membership ID.");
  }

  await client.query(
    `INSERT INTO "audit_event"
      ("actor_membership_id", "event_type", "target_type", "target_id", "metadata")
     VALUES ($1, 'membership.bootstrap_admin', 'membership', $1, '{"source":"bootstrap-first-admin"}'::jsonb)`,
    [membershipId],
  );

  await client.query("COMMIT");

  console.log(
    `Created first ADMIN membership ${membershipId} for auth user ${authUserId}.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
