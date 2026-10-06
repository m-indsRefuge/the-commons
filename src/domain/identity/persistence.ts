import type {
  AuditEventInput,
  CommonsRole,
  Invite,
  Membership,
} from "./types";

export interface CreateInviteRecord {
  tokenHash: string;
  emailNormalized: string | null;
  createdByMembershipId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateMembershipRecord {
  authUserId: string;
  status: "ACTIVE";
  role: CommonsRole;
  admittedAt: Date;
}

export interface ConsumeInviteRecord {
  inviteId: string;
  membershipId: string;
  consumedAt: Date;
}

export interface IdentityTransaction {
  findInviteByTokenHash(tokenHash: string): Promise<Invite | null>;
  findMembershipByAuthUserId(authUserId: string): Promise<Membership | null>;
  createInvite(input: CreateInviteRecord): Promise<Invite>;
  createMembership(input: CreateMembershipRecord): Promise<Membership>;
  consumeInvite(input: ConsumeInviteRecord): Promise<boolean>;
  appendAuditEvent(event: AuditEventInput & { createdAt: Date }): Promise<void>;
}

export interface IdentityPersistence {
  transaction<T>(
    operation: (transaction: IdentityTransaction) => Promise<T>,
  ): Promise<T>;
  findMembershipByAuthUserId(authUserId: string): Promise<Membership | null>;
}
