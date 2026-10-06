export type ArtifactKind =
  | "REPOSITORY"
  | "DEMO"
  | "SCREENSHOT"
  | "DOCUMENT"
  | "RELEASE"
  | "BENCHMARK"
  | "OTHER";

export interface Artifact {
  id: string;
  projectId: string;
  createdByMembershipId: string;
  kind: ArtifactKind;
  title: string;
  summary: string | null;
  uri: string | null;
  contentHash: string | null;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
  createdAt: Date;
  updatedAt: Date;
}
