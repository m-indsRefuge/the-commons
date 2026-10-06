export type ContributionKind =
  | "CODE"
  | "DESIGN"
  | "RESEARCH"
  | "REVIEW"
  | "TESTING"
  | "DOCUMENTATION"
  | "OPERATIONS"
  | "OTHER";

export interface ContributionCredit {
  id: string;
  projectId: string;
  contributorMembershipId: string;
  recordedByMembershipId: string;
  attributedAgentId: string | null;
  artifactId: string | null;
  kind: ContributionKind;
  summary: string;
  evidenceUri: string | null;
  occurredAt: Date | null;
  createdAt: Date;
}
