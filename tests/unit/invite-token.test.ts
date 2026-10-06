import { describe, expect, it } from "vitest";

import {
  generateInviteToken,
  hashInviteToken,
} from "@/domain/identity/invite-token";

describe("invite token security", () => {
  it("generates high-entropy URL-safe tokens", () => {
    const first = generateInviteToken();
    const second = generateInviteToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes deterministically with a secret", () => {
    const first = hashInviteToken("token", "secret-a");
    const second = hashInviteToken("token", "secret-a");
    const differentSecret = hashInviteToken("token", "secret-b");

    expect(first).toBe(second);
    expect(first).not.toBe(differentSecret);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
