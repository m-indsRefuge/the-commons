import type { ContentVisibility } from "@/domain/core/types";

import type { RequestActor } from "./actor";
import type { AuthorizationDecision } from "./policy";
import { requireActiveMember, requireOwner } from "./policy";

export interface ProjectAuthorityContext {
  ownerMembershipId: string;
  maintainerMembershipIds: readonly string[];
}

export function requireDeveloperProfileOwner(
  actor: RequestActor,
  membershipId: string,
): AuthorizationDecision {
  return requireOwner(actor, membershipId);
}

export function requireAgentOperator(
  actor: RequestActor,
  operatorMembershipId: string,
): AuthorizationDecision {
  const active = requireActiveMember(actor);
  if (!active.allowed) return active;

  if (actor.membershipId !== operatorMembershipId) {
    return { allowed: false, reason: "NOT_OPERATOR" };
  }

  return { allowed: true };
}

export function requireProjectManager(
  actor: RequestActor,
  project: ProjectAuthorityContext,
): AuthorizationDecision {
  const active = requireActiveMember(actor);
  if (!active.allowed) return active;

  if (actor.membershipId === project.ownerMembershipId) {
    return { allowed: true };
  }

  if (
    actor.membershipId &&
    project.maintainerMembershipIds.includes(actor.membershipId)
  ) {
    return { allowed: true };
  }

  return { allowed: false, reason: "NOT_PROJECT_MANAGER" };
}

export function requireContributionRecorder(
  actor: RequestActor,
  contributorMembershipId: string,
  project: ProjectAuthorityContext,
): AuthorizationDecision {
  const active = requireActiveMember(actor);
  if (!active.allowed) return active;

  if (actor.membershipId === contributorMembershipId) {
    return { allowed: true };
  }

  return requireProjectManager(actor, project);
}

export function canReadCoreContent(
  actor: RequestActor,
  visibility: ContentVisibility,
  authorityMembershipIds: readonly string[],
): AuthorizationDecision {
  if (visibility === "PUBLIC") return { allowed: true };

  const active = requireActiveMember(actor);
  if (!active.allowed) return active;

  if (visibility === "MEMBERS") return { allowed: true };

  if (
    actor.membershipId &&
    authorityMembershipIds.includes(actor.membershipId)
  ) {
    return { allowed: true };
  }

  return { allowed: false, reason: "NOT_OWNER" };
}
