import { describe, expect, it } from "vitest";

import {
  hasAccountableAgentOperator,
  hasCanonicalProjectOwner,
  hasHumanContributionAuthority,
  isValidDeveloperHandle,
  isValidSlug,
  normalizeHandle,
  normalizeSlug,
} from "@/domain/core/invariants";

describe("core-domain invariants", () => {
  it("normalizes handles and slugs before validation", () => {
    expect(normalizeHandle(" Nolan-AI ")).toBe("nolan-ai");
    expect(normalizeSlug(" Project-One ")).toBe("project-one");
  });

  it("accepts conservative URL-safe handles and slugs", () => {
    expect(isValidDeveloperHandle("nolan-ai")).toBe(true);
    expect(isValidSlug("the-commons")).toBe(true);
  });

  it("rejects malformed handles and slugs", () => {
    expect(isValidDeveloperHandle("-nolan")).toBe(false);
    expect(isValidDeveloperHandle("nolan_rocks")).toBe(false);
    expect(isValidSlug("Project One")).toBe(false);
  });

  it("requires a human contributor and recorder for contribution provenance", () => {
    expect(
      hasHumanContributionAuthority({
        contributorMembershipId: "member-1",
        recordedByMembershipId: "member-2",
      }),
    ).toBe(true);

    expect(
      hasHumanContributionAuthority({
        contributorMembershipId: null,
        recordedByMembershipId: "member-2",
      }),
    ).toBe(false);
  });

  it("requires human authority for Agent operation and Project ownership", () => {
    expect(hasAccountableAgentOperator("member-1")).toBe(true);
    expect(hasAccountableAgentOperator(" ")).toBe(false);
    expect(hasCanonicalProjectOwner("member-1")).toBe(true);
    expect(hasCanonicalProjectOwner(undefined)).toBe(false);
  });
});
