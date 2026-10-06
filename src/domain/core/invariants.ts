const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function normalizeHandle(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidDeveloperHandle(value: string): boolean {
  return HANDLE_PATTERN.test(normalizeHandle(value));
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(normalizeSlug(value));
}

export function hasHumanContributionAuthority(input: {
  contributorMembershipId: string | null | undefined;
  recordedByMembershipId: string | null | undefined;
}): boolean {
  return Boolean(
    input.contributorMembershipId?.trim() &&
      input.recordedByMembershipId?.trim(),
  );
}

export function hasAccountableAgentOperator(
  operatorMembershipId: string | null | undefined,
): boolean {
  return Boolean(operatorMembershipId?.trim());
}

export function hasCanonicalProjectOwner(
  ownerMembershipId: string | null | undefined,
): boolean {
  return Boolean(ownerMembershipId?.trim());
}
