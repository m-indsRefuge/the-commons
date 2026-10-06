import type { RequestActor } from "@/authorization/actor";
import { anonymousActor } from "@/authorization/actor";
import { DrizzleIdentityPersistence } from "@/infrastructure/database/identity-persistence";

import { getAuth } from "./auth";

export interface AuthenticatedSessionUser {
  authUserId: string;
  email: string;
  emailVerified: boolean;
}

export async function getAuthenticatedSessionUser(
  requestHeaders: Headers,
): Promise<AuthenticatedSessionUser | null> {
  const session = await getAuth().api.getSession({
    headers: requestHeaders,
  });

  if (!session) return null;

  return {
    authUserId: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
  };
}

export async function resolveRequestActor(
  requestHeaders: Headers,
): Promise<RequestActor> {
  const sessionUser = await getAuthenticatedSessionUser(requestHeaders);
  if (!sessionUser) return anonymousActor;

  const membership =
    await new DrizzleIdentityPersistence().findMembershipByAuthUserId(
      sessionUser.authUserId,
    );

  if (!membership) return anonymousActor;

  return {
    membershipId: membership.id,
    authUserId: membership.authUserId,
    role: membership.role,
    membershipStatus: membership.status,
    suspendedAt: membership.suspendedAt,
  };
}
