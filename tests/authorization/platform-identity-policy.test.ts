import { describe, expect, it } from "vitest";
import { anonymousActor } from "@/authorization/actor";
import {
  requireActiveMember,
  requireOwner,
  requireRole,
} from "@/authorization/policy";

const activeMember = {
  membershipId: "member-a",
  authUserId: "auth-a",
  role: "MEMBER" as const,
  membershipStatus: "ACTIVE" as const,
  suspendedAt: null,
};

describe("platform identity authorization policy", () => {
  it("denies anonymous member writes", () => {
    expect(requireActiveMember(anonymousActor)).toEqual({
      allowed: false,
      reason: "UNAUTHENTICATED",
    });
  });

  it("denies suspended members", () => {
    expect(
      requireActiveMember({
        ...activeMember,
        suspendedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toEqual({ allowed: false, reason: "SUSPENDED" });
  });

  it("denies cross-account ownership mutation", () => {
    expect(requireOwner(activeMember, "member-b")).toEqual({
      allowed: false,
      reason: "NOT_OWNER",
    });
  });

  it("requires moderator/admin role for moderation actions", () => {
    expect(requireRole(activeMember, ["MODERATOR", "ADMIN"])).toEqual({
      allowed: false,
      reason: "ROLE_REQUIRED",
    });
  });
});
