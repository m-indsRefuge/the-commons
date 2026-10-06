export type MembershipStatus =
  | "INVITED"
  | "ACTIVE"
  | "SUSPENDED"
  | "DEACTIVATED";

export type CommonsRole = "MEMBER" | "MODERATOR" | "ADMIN";

export interface Membership {
  id: string;
  authUserId: string;
  status: MembershipStatus;
  role: CommonsRole;
  admittedAt: Date | null;
  suspendedAt: Date | null;
}

export interface Invite {
  id: string;
  tokenHash: string;
  emailNormalized: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  consumedAt: Date | null;
}

export interface AuditEventInput {
  actorMembershipId: string | null;
  eventType: string;
  targetType?: string;
  targetId?: string;
  correlationId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
