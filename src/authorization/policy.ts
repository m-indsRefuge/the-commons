import type { RequestActor } from "./actor";

export type AuthorizationDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "UNAUTHENTICATED"
        | "MEMBERSHIP_INACTIVE"
        | "SUSPENDED"
        | "ROLE_REQUIRED"
        | "NOT_OWNER";
    };

export function requireActiveMember(
  actor: RequestActor,
): AuthorizationDecision {
  if (!actor.membershipId) return { allowed: false, reason: "UNAUTHENTICATED" };
  if (actor.suspendedAt) return { allowed: false, reason: "SUSPENDED" };
  if (actor.membershipStatus !== "ACTIVE") {
    return { allowed: false, reason: "MEMBERSHIP_INACTIVE" };
  }
  return { allowed: true };
}

export function requireRole(
  actor: RequestActor,
  roles: readonly ("MEMBER" | "MODERATOR" | "ADMIN")[],
): AuthorizationDecision {
  const active = requireActiveMember(actor);
  if (!active.allowed) return active;
  if (!actor.role || !roles.includes(actor.role)) {
    return { allowed: false, reason: "ROLE_REQUIRED" };
  }
  return { allowed: true };
}

export function requireOwner(
  actor: RequestActor,
  ownerMembershipId: string,
): AuthorizationDecision {
  const active = requireActiveMember(actor);
  if (!active.allowed) return active;
  if (actor.membershipId !== ownerMembershipId) {
    return { allowed: false, reason: "NOT_OWNER" };
  }
  return { allowed: true };
}
