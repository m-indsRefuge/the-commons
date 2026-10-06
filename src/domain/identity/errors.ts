export type IdentityErrorCode =
  | "FORBIDDEN"
  | "INVALID_EXPIRY"
  | "INVITE_NOT_FOUND"
  | "INVITE_REVOKED"
  | "INVITE_CONSUMED"
  | "INVITE_EXPIRED"
  | "INVITE_EMAIL_MISMATCH"
  | "MEMBERSHIP_EXISTS"
  | "INVITE_RACE_LOST";

export class IdentityError extends Error {
  constructor(
    public readonly code: IdentityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "IdentityError";
  }
}
