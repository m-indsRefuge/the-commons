import type { ContentVisibility, RecordStatus } from "@/domain/core/types";

export type ProjectMemberRole = "MAINTAINER" | "CONTRIBUTOR";

export interface Project {
  id: string;
  ownerMembershipId: string;
  slug: string;
  name: string;
  summary: string;
  description: string | null;
  homepageUrl: string | null;
  repositoryUrl: string | null;
  status: RecordStatus;
  visibility: ContentVisibility;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  projectId: string;
  membershipId: string;
  role: ProjectMemberRole;
  addedByMembershipId: string;
  createdAt: Date;
}

export interface ProjectAgent {
  projectId: string;
  agentId: string;
  relationship: string | null;
  linkedByMembershipId: string;
  createdAt: Date;
}

export interface ProjectHarness {
  id: string;
  projectId: string;
  recordedByMembershipId: string;
  name: string;
  runtime: string | null;
  version: string | null;
  description: string | null;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
  createdAt: Date;
  updatedAt: Date;
}
