import type { RequestActor } from "@/authorization/actor";
import { requireRole } from "@/authorization/policy";

import { IdentityError } from "./errors";
import { checkInvite, normalizeEmail } from "./invariants";
import { generateInviteToken, hashInviteToken } from "./invite-token";
import type { IdentityPersistence } from "./persistence";
import type { Invite, Membership } from "./types";

export interface CreateInviteInput {
  email?: string;
  expiresAt: Date;
  now?: Date;
  correlationId?: string;
}

export interface CreatedInvite {
  invite: Invite;
  token: string;
}

export interface RedeemInviteInput {
  token: string;
  authUserId: string;
  authenticatedEmail: string;
  now?: Date;
  correlationId?: string;
}

export class IdentityService {
  constructor(
    private readonly persistence: IdentityPersistence,
    private readonly inviteTokenSecret: string,
  ) {}

  async createInvite(
    actor: RequestActor,
    input: CreateInviteInput,
  ): Promise<CreatedInvite> {
    const decision = requireRole(actor, ["ADMIN"]);
    if (!decision.allowed || !actor.membershipId) {
      throw new IdentityError(
        "FORBIDDEN",
        decision.allowed ? "ACTIVE_ADMIN_REQUIRED" : decision.reason,
      );
    }

    const now = input.now ?? new Date();
    if (input.expiresAt.getTime() <= now.getTime()) {
      throw new IdentityError(
        "INVALID_EXPIRY",
        "Invitation expiry must be in the future.",
      );
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token, this.inviteTokenSecret);
    const emailNormalized = input.email ? normalizeEmail(input.email) : null;

    const invite = await this.persistence.transaction(async (transaction) => {
      const created = await transaction.createInvite({
        tokenHash,
        emailNormalized,
        createdByMembershipId: actor.membershipId,
        expiresAt: input.expiresAt,
        createdAt: now,
      });

      await transaction.appendAuditEvent({
        actorMembershipId: actor.membershipId,
        eventType: "invite.created",
        targetType: "invite",
        targetId: created.id,
        correlationId: input.correlationId,
        metadata: {
          emailBound: emailNormalized !== null,
        },
        createdAt: now,
      });

      return created;
    });

    return { invite, token };
  }

  async redeemInvite(input: RedeemInviteInput): Promise<Membership> {
    const now = input.now ?? new Date();
    const tokenHash = hashInviteToken(input.token, this.inviteTokenSecret);

    return this.persistence.transaction(async (transaction) => {
      const invite = await transaction.findInviteByTokenHash(tokenHash);
      if (!invite) {
        throw new IdentityError(
          "INVITE_NOT_FOUND",
          "Invitation was not found.",
        );
      }

      const check = checkInvite(invite, now, input.authenticatedEmail);
      if (!check.ok) {
        const codes = {
          REVOKED: "INVITE_REVOKED",
          CONSUMED: "INVITE_CONSUMED",
          EXPIRED: "INVITE_EXPIRED",
          EMAIL_MISMATCH: "INVITE_EMAIL_MISMATCH",
        } as const;

        throw new IdentityError(codes[check.reason], check.reason);
      }

      const existing = await transaction.findMembershipByAuthUserId(
        input.authUserId,
      );
      if (existing) {
        throw new IdentityError(
          "MEMBERSHIP_EXISTS",
          "This authenticated identity already has a Commons membership.",
        );
      }

      const membership = await transaction.createMembership({
        authUserId: input.authUserId,
        status: "ACTIVE",
        role: "MEMBER",
        admittedAt: now,
      });

      const consumed = await transaction.consumeInvite({
        inviteId: invite.id,
        membershipId: membership.id,
        consumedAt: now,
      });

      if (!consumed) {
        throw new IdentityError(
          "INVITE_RACE_LOST",
          "Invitation could not be consumed.",
        );
      }

      await transaction.appendAuditEvent({
        actorMembershipId: membership.id,
        eventType: "membership.activated",
        targetType: "membership",
        targetId: membership.id,
        correlationId: input.correlationId,
        metadata: {
          inviteId: invite.id,
        },
        createdAt: now,
      });

      return membership;
    });
  }
}
