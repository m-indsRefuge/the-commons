import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { RequestActor } from "@/authorization/actor";
import { hashInviteToken } from "@/domain/identity/invite-token";
import { IdentityService } from "@/domain/identity/service";
import {
  closeDatabase,
  getDatabase,
} from "@/infrastructure/database/client";
import { DrizzleIdentityPersistence } from "@/infrastructure/database/identity-persistence";
import {
  auditEvents,
  invites,
  memberships,
} from "@/infrastructure/database/schema";

const inviteSecret = "integration-invite-secret";

async function resetIdentityTables(): Promise<void> {
  await getDatabase().execute(sql.raw(
    'TRUNCATE TABLE "audit_event", "invite", "commons_membership" CASCADE',
  ));
}

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await resetIdentityTables();
});

describe("DrizzleIdentityPersistence", () => {
  it("persists invite creation and redemption atomically", async () => {
    const database = getDatabase();
    const now = new Date("2026-10-06T10:00:00.000Z");

    const [adminMembership] = await database
      .insert(memberships)
      .values({
        authUserId: "auth-admin",
        status: "ACTIVE",
        role: "ADMIN",
        admittedAt: now,
      })
      .returning();

    expect(adminMembership).toBeDefined();

    const adminActor: RequestActor = {
      membershipId: adminMembership!.id,
      authUserId: adminMembership!.authUserId,
      role: adminMembership!.role,
      membershipStatus: adminMembership!.status,
      suspendedAt: adminMembership!.suspendedAt,
    };

    const service = new IdentityService(
      new DrizzleIdentityPersistence(database),
      inviteSecret,
    );

    const created = await service.createInvite(adminActor, {
      email: " Builder@Example.COM ",
      expiresAt: new Date("2026-10-07T10:00:00.000Z"),
      now,
      correlationId: "integration-create-invite",
    });

    const persistedInvites = await database.select().from(invites);
    expect(persistedInvites).toHaveLength(1);
    expect(persistedInvites[0]?.tokenHash).toBe(
      hashInviteToken(created.token, inviteSecret),
    );
    expect(persistedInvites[0]?.tokenHash).not.toBe(created.token);
    expect(persistedInvites[0]?.emailNormalized).toBe(
      "builder@example.com",
    );

    const membership = await service.redeemInvite({
      token: created.token,
      authUserId: "auth-builder",
      authenticatedEmail: "builder@example.com",
      now: new Date("2026-10-06T10:05:00.000Z"),
      correlationId: "integration-redeem-invite",
    });

    expect(membership.status).toBe("ACTIVE");
    expect(membership.role).toBe("MEMBER");

    const persistedMemberships = await database.select().from(memberships);
    expect(persistedMemberships).toHaveLength(2);

    const consumedInvites = await database.select().from(invites);
    expect(consumedInvites[0]?.consumedAt).not.toBeNull();
    expect(consumedInvites[0]?.consumedByMembershipId).toBe(membership.id);

    const audits = await database.select().from(auditEvents);
    expect(audits.map((event) => event.eventType).sort()).toEqual([
      "invite.created",
      "membership.activated",
    ]);
  });

  it("rejects reuse of a consumed invite without creating another member", async () => {
    const database = getDatabase();
    const now = new Date("2026-10-06T10:00:00.000Z");

    const [adminMembership] = await database
      .insert(memberships)
      .values({
        authUserId: "auth-admin",
        status: "ACTIVE",
        role: "ADMIN",
        admittedAt: now,
      })
      .returning();

    const service = new IdentityService(
      new DrizzleIdentityPersistence(database),
      inviteSecret,
    );

    const created = await service.createInvite(
      {
        membershipId: adminMembership!.id,
        authUserId: adminMembership!.authUserId,
        role: "ADMIN",
        membershipStatus: "ACTIVE",
        suspendedAt: null,
      },
      {
        expiresAt: new Date("2026-10-07T10:00:00.000Z"),
        now,
      },
    );

    await service.redeemInvite({
      token: created.token,
      authUserId: "auth-first-member",
      authenticatedEmail: "first@example.com",
      now: new Date("2026-10-06T10:01:00.000Z"),
    });

    await expect(
      service.redeemInvite({
        token: created.token,
        authUserId: "auth-second-member",
        authenticatedEmail: "second@example.com",
        now: new Date("2026-10-06T10:02:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "INVITE_CONSUMED" });

    const persistedMemberships = await database.select().from(memberships);
    expect(persistedMemberships).toHaveLength(2);
  });
});
