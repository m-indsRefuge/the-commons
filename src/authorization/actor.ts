import type { CommonsRole, MembershipStatus } from "@/domain/identity/types";

export interface AuthenticatedActor {
  membershipId: string;
  authUserId: string;
  role: CommonsRole;
  membershipStatus: MembershipStatus;
  suspendedAt: Date | null;
}

export interface AnonymousActor {
  membershipId: null;
  authUserId: null;
  role: null;
  membershipStatus: null;
  suspendedAt: null;
}

export type RequestActor = AuthenticatedActor | AnonymousActor;

export const anonymousActor: AnonymousActor = {
  membershipId: null,
  authUserId: null,
  role: null,
  membershipStatus: null,
  suspendedAt: null,
};
