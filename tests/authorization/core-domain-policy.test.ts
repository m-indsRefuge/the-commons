import { describe, expect, it } from "vitest";

import type { RequestActor } from "@/authorization/actor";
import {
  canReadCoreContent,
  requireAgentOperator,
  requireContributionRecorder,
  requireProjectManager,
} from "@/authorization/core-domain-policy";

const activeMember: RequestActor = {
  membershipId: "member-1",
  authUserId: "auth-1",
  role: "MEMBER",
  membershipStatus: "ACTIVE",
  suspendedAt: null,
};

const suspendedMember: RequestActor = {
  ...activeMember,
  suspendedAt: new Date("2026-10-06T10:00:00Z"),
};

const project = {
  ownerMembershipId: "owner-1",
  maintainerMembershipIds: ["maintainer-1"],
};

describe("core-domain authorization", () => {
  it("allows only the accountable operator to manage an Agent", () => {
    expect(requireAgentOperator(activeMember, "member-1")).toEqual({
      allowed: true,
    });

    expect(requireAgentOperator(activeMember, "member-2")).toEqual({
      allowed: false,
      reason: "NOT_OPERATOR",
    });
  });

  it("allows Project owners and maintainers to manage a Project", () => {
    expect(
      requireProjectManager(
        { ...activeMember, membershipId: "owner-1" },
        project,
      ),
    ).toEqual({ allowed: true });

    expect(
      requireProjectManager(
        { ...activeMember, membershipId: "maintainer-1" },
        project,
      ),
    ).toEqual({ allowed: true });

    expect(requireProjectManager(activeMember, project)).toEqual({
      allowed: false,
      reason: "NOT_PROJECT_MANAGER",
    });
  });

  it("lets a contributor record their own contribution", () => {
    expect(
      requireContributionRecorder(activeMember, "member-1", project),
    ).toEqual({ allowed: true });
  });

  it("denies suspended actors before project authority is considered", () => {
    expect(
      requireContributionRecorder(suspendedMember, "member-1", project),
    ).toEqual({ allowed: false, reason: "SUSPENDED" });
  });

  it("allows PUBLIC reads without membership and gates MEMBERS/PRIVATE reads", () => {
    const anonymous: RequestActor = {
      membershipId: null,
      authUserId: null,
      role: null,
      membershipStatus: null,
      suspendedAt: null,
    };

    expect(canReadCoreContent(anonymous, "PUBLIC", [])).toEqual({
      allowed: true,
    });

    expect(canReadCoreContent(anonymous, "MEMBERS", [])).toEqual({
      allowed: false,
      reason: "UNAUTHENTICATED",
    });

    expect(
      canReadCoreContent(activeMember, "PRIVATE", ["member-1"]),
    ).toEqual({ allowed: true });

    expect(canReadCoreContent(activeMember, "PRIVATE", ["member-2"])).toEqual({
      allowed: false,
      reason: "NOT_OWNER",
    });
  });
});
