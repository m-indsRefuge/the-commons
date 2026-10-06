import { and, eq, gt, isNull } from "drizzle-orm";

import type {
  IdentityPersistence,
  IdentityTransaction,
} from "@/domain/identity/persistence";
import type { Invite, Membership } from "@/domain/identity/types";

import { getDatabase, type CommonsDatabase } from "./client";
import { auditEvents, invites, memberships } from "./schema";

function mapMembership(row: typeof memberships.$inferSelect): Membership {
  return {
    id: row.id,
    authUserId: row.authUserId,
    status: row.status,
    role: row.role,
    admittedAt: row.admittedAt,
    suspendedAt: row.suspendedAt,
  };
}

function mapInvite(row: typeof invites.$inferSelect): Invite {
  return {
    id: row.id,
    tokenHash: row.tokenHash,
    emailNormalized: row.emailNormalized,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    consumedAt: row.consumedAt,
  };
}

export class DrizzleIdentityPersistence implements IdentityPersistence {
  constructor(private readonly database: CommonsDatabase = getDatabase()) {}

  async findMembershipByAuthUserId(
    authUserId: string,
  ): Promise<Membership | null> {
    const [row] = await this.database
      .select()
      .from(memberships)
      .where(eq(memberships.authUserId, authUserId))
      .limit(1);

    return row ? mapMembership(row) : null;
  }

  async transaction<T>(
    operation: (transaction: IdentityTransaction) => Promise<T>,
  ): Promise<T> {
    return this.database.transaction(async (databaseTransaction) => {
      const transaction: IdentityTransaction = {
        findInviteByTokenHash: async (tokenHash) => {
          const [row] = await databaseTransaction
            .select()
            .from(invites)
            .where(eq(invites.tokenHash, tokenHash))
            .limit(1);

          return row ? mapInvite(row) : null;
        },

        findMembershipByAuthUserId: async (authUserId) => {
          const [row] = await databaseTransaction
            .select()
            .from(memberships)
            .where(eq(memberships.authUserId, authUserId))
            .limit(1);

          return row ? mapMembership(row) : null;
        },

        createInvite: async (input) => {
          const [row] = await databaseTransaction
            .insert(invites)
            .values(input)
            .returning();

          if (!row) {
            throw new Error("Database did not return the created invite.");
          }

          return mapInvite(row);
        },

        createMembership: async (input) => {
          const [row] = await databaseTransaction
            .insert(memberships)
            .values({
              ...input,
              suspendedAt: null,
            })
            .returning();

          if (!row) {
            throw new Error("Database did not return the created membership.");
          }

          return mapMembership(row);
        },

        consumeInvite: async (input) => {
          const rows = await databaseTransaction
            .update(invites)
            .set({
              consumedAt: input.consumedAt,
              consumedByMembershipId: input.membershipId,
            })
            .where(
              and(
                eq(invites.id, input.inviteId),
                isNull(invites.consumedAt),
                isNull(invites.revokedAt),
                gt(invites.expiresAt, input.consumedAt),
              ),
            )
            .returning({ id: invites.id });

          return rows.length === 1;
        },

        appendAuditEvent: async (event) => {
          await databaseTransaction.insert(auditEvents).values({
            actorMembershipId: event.actorMembershipId,
            eventType: event.eventType,
            targetType: event.targetType,
            targetId: event.targetId,
            correlationId: event.correlationId,
            metadata: event.metadata ?? {},
            createdAt: event.createdAt,
          });
        },
      };

      return operation(transaction);
    });
  }
}
