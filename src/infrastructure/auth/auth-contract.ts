export interface AuthenticatedIdentity {
  provider: "github";
  providerAccountId: string;
  authUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  imageUrl: string | null;
}

export interface SessionIdentityProvider {
  getCurrentIdentity(): Promise<AuthenticatedIdentity | null>;
  revokeCurrentSession(): Promise<void>;
}

/**
 * Repository authorization is intentionally absent from this interface.
 * GitHub repository access belongs to the later GitHub App integration.
 */
