export type EvidenceKind =
  | "TEST"
  | "DEMO"
  | "BENCHMARK"
  | "DEPLOYMENT"
  | "REVIEW"
  | "RELEASE"
  | "OTHER";

export interface ProjectEvidence {
  id: string;
  projectId: string;
  artifactId: string | null;
  recordedByMembershipId: string;
  kind: EvidenceKind;
  title: string;
  summary: string | null;
  uri: string | null;
  observedAt: Date | null;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
  createdAt: Date;
}
