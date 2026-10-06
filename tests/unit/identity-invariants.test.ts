import { describe, expect, it } from "vitest";
import { checkInvite, normalizeEmail } from "@/domain/identity/invariants";
import type { Invite } from "@/domain/identity/types";

const baseInvite = (overrides: Partial<Invite> = {}): Invite => ({
  id: "invite-1",
  tokenHash: "hash",
  emailNormalized: null,
  expiresAt: new Date("2030-01-01T00:00:00Z"),
  revokedAt: null,
  consumedAt: null,
  ...overrides,
});

describe("identity invariants", () => {
  it("normalizes email deterministically", () => {
    expect(normalizeEmail("  Nolan@Example.COM ")).toBe("nolan@example.com");
  });

  it("accepts a valid invite", () => {
    expect(checkInvite(baseInvite(), new Date("2029-01-01T00:00:00Z"))).toEqual(
      { ok: true },
    );
  });

  it.each([
    ["REVOKED", { revokedAt: new Date("2028-01-01T00:00:00Z") }],
    ["CONSUMED", { consumedAt: new Date("2028-01-01T00:00:00Z") }],
    ["EXPIRED", { expiresAt: new Date("2028-01-01T00:00:00Z") }],
  ] as const)("rejects %s invites", (reason, overrides) => {
    expect(
      checkInvite(baseInvite(overrides), new Date("2029-01-01T00:00:00Z")),
    ).toEqual({ ok: false, reason });
  });

  it("enforces an email-bound invite", () => {
    expect(
      checkInvite(
        baseInvite({ emailNormalized: "founder@example.com" }),
        new Date("2029-01-01T00:00:00Z"),
        "other@example.com",
      ),
    ).toEqual({ ok: false, reason: "EMAIL_MISMATCH" });
  });
});
