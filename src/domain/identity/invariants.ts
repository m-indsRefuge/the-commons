import type { Invite, Membership } from "./types";

export type InviteRejectionReason =
  "REVOKED" | "CONSUMED" | "EXPIRED" | "EMAIL_MISMATCH";

export type InviteCheck =
  { ok: true } | { ok: false; reason: InviteRejectionReason };

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function checkInvite(
  invite: Invite,
  now: Date,
  authenticatedEmail?: string,
): InviteCheck {
  if (invite.revokedAt) return { ok: false, reason: "REVOKED" };
  if (invite.consumedAt) return { ok: false, reason: "CONSUMED" };
  if (invite.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "EXPIRED" };
  }

  if (
    invite.emailNormalized &&
    (!authenticatedEmail ||
      normalizeEmail(authenticatedEmail) !== invite.emailNormalized)
  ) {
    return { ok: false, reason: "EMAIL_MISMATCH" };
  }

  return { ok: true };
}

export function isActiveMember(membership: Membership): boolean {
  return membership.status === "ACTIVE" && membership.suspendedAt === null;
}
