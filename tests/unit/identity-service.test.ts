import { describe, expect, it } from "vitest";

import type { RequestActor } from "@/authorization/actor";
import { hashInviteToken } from "@/domain/identity/invite-token";
import type {
  IdentityPersistence,
  IdentityTransaction,
} from "@/domain/identity/persistence";
import { IdentityService } from "@/domain/identity/service";
import type {
  AuditEventInput,
  Invite,
  Membership,
} from "@/domain/identity/types";

class FakeIdentityPersistence implements IdentityPersistence {
  invite: Invite | null = null;
  membership: Membership | null = null;
  audits: Array<AuditEventInput & { createdAt: Date }> = [];
  consumeSucceeds = true;

  async findMembershipByAuthUserId(
    authUserId: string,
  ): Promise<Membership | null> {
    return this.membership?.authUserId === authUserId ? this.membership : null;
  }

  async transaction<T>(
    operation: (transaction: IdentityTransaction) => Promise<T>,
  ): Promise<T> {
    const transaction: IdentityTransaction = {
      findInviteByTokenHash: async (tokenHash) =>
        this.invite?.tokenHash === tokenHash ? this.invite : null,
      findMembershipByAuthUserId: async (authUserId) =>
        this.membership?.authUserId === authUserId ? this.membership : null,
      createInvite: async (input) => {
        this.invite = {
          id: "invite-created",
          tokenHash: input.tokenHash,
          emailNormalized: input.emailNormalized,
          expiresAt: input.expiresAt,
          revokedAt: null,
          consumedAt: null,
        };
        return this.invite;
      },
      createMembership: async (input) => {
        this.membership = {
          id: "member-created",
          authUserId: input.authUserId,
          status: input.status,
          role: input.role,
          admittedAt: input.admittedAt,
          suspendedAt: null,
        };
        return this.membership;
      },
      consumeInvite: async (input) => {
        if (!this.consumeSucceeds || !this.invite) return false;
        this.invite = {
          ...this.invite,
          consumedAt: input.consumedAt,
        };
        return true;
      },
      appendAuditEvent: async (event) => {
        this.audits.push(event);
      },
    };

    return operation(transaction);
  }
}

const adminActor: RequestActor = {
  membershipId: "admin-1",
  authUserId: "auth-admin",
  role: "ADMIN",
  membershipStatus: "ACTIVE",
  suspendedAt: null,
};

describe("IdentityService", () => {
  it("creates an email-bound invite for an active admin", async () => {
    const persistence = new FakeIdentityPersistence();
    const service = new IdentityService(persistence, "invite-secret");
    const now = new Date("2026-10-06T10:00:00Z");

    const result = await service.createInvite(adminActor, {
      email: " Founder@Example.COM ",
      expiresAt: new Date("2026-10-07T10:00:00Z"),
      now,
    });

    expect(result.token.length).toBeGreaterThanOrEqual(40);
    expect(result.invite.emailNormalized).toBe("founder@example.com");
    expect(result.invite.tokenHash).not.toBe(result.token);
    expect(persistence.audits[0]?.eventType).toBe("invite.created");
  });

  it("rejects invite creation from a normal member", async () => {
    const persistence = new FakeIdentityPersistence();
    const service = new IdentityService(persistence, "invite-secret");

    await expect(
      service.createInvite(
        { ...adminActor, role: "MEMBER" },
        {
          expiresAt: new Date("2026-10-07T10:00:00Z"),
          now: new Date("2026-10-06T10:00:00Z"),
        },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("redeems a valid invite into an active membership", async () => {
    const persistence = new FakeIdentityPersistence();
    const secret = "invite-secret";
    persistence.invite = {
      id: "invite-1",
      tokenHash: hashInviteToken("raw-token", secret),
      emailNormalized: "founder@example.com",
      expiresAt: new Date("2026-10-07T10:00:00Z"),
      revokedAt: null,
      consumedAt: null,
    };

    const service = new IdentityService(persistence, secret);
    const membership = await service.redeemInvite({
      token: "raw-token",
      authUserId: "auth-user-1",
      authenticatedEmail: "Founder@Example.com",
      now: new Date("2026-10-06T10:00:00Z"),
    });

    expect(membership.status).toBe("ACTIVE");
    expect(membership.role).toBe("MEMBER");
    expect(persistence.invite?.consumedAt).not.toBeNull();
    expect(persistence.audits.at(-1)?.eventType).toBe("membership.activated");
  });

  it("rejects an email mismatch", async () => {
    const persistence = new FakeIdentityPersistence();
    const secret = "invite-secret";
    persistence.invite = {
      id: "invite-1",
      tokenHash: hashInviteToken("raw-token", secret),
      emailNormalized: "founder@example.com",
      expiresAt: new Date("2026-10-07T10:00:00Z"),
      revokedAt: null,
      consumedAt: null,
    };

    const service = new IdentityService(persistence, secret);

    await expect(
      service.redeemInvite({
        token: "raw-token",
        authUserId: "auth-user-1",
        authenticatedEmail: "other@example.com",
        now: new Date("2026-10-06T10:00:00Z"),
      }),
    ).rejects.toMatchObject({ code: "INVITE_EMAIL_MISMATCH" });
  });

  it("fails closed when another request consumes the invite first", async () => {
    const persistence = new FakeIdentityPersistence();
    const secret = "invite-secret";
    persistence.consumeSucceeds = false;
    persistence.invite = {
      id: "invite-1",
      tokenHash: hashInviteToken("raw-token", secret),
      emailNormalized: null,
      expiresAt: new Date("2026-10-07T10:00:00Z"),
      revokedAt: null,
      consumedAt: null,
    };

    const service = new IdentityService(persistence, secret);

    await expect(
      service.redeemInvite({
        token: "raw-token",
        authUserId: "auth-user-1",
        authenticatedEmail: "founder@example.com",
        now: new Date("2026-10-06T10:00:00Z"),
      }),
    ).rejects.toMatchObject({ code: "INVITE_RACE_LOST" });
  });
});
