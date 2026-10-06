import type { AgentProfile } from "@/domain/agents/types";
import type { Artifact } from "@/domain/artifacts/types";
import type { ContributionCredit } from "@/domain/contributions/types";
import type { DeveloperProfile } from "@/domain/developers/types";
import type { ProjectEvidence } from "@/domain/evidence/types";
import type {
  Project,
  ProjectAgent,
  ProjectHarness,
  ProjectMember,
} from "@/domain/projects/types";

export interface DeveloperProfileRepository {
  findByMembershipId(membershipId: string): Promise<DeveloperProfile | null>;
  findByHandle(handle: string): Promise<DeveloperProfile | null>;
  create(profile: DeveloperProfile): Promise<DeveloperProfile>;
  update(profile: DeveloperProfile): Promise<DeveloperProfile>;
}

export interface AgentProfileRepository {
  findById(id: string): Promise<AgentProfile | null>;
  findBySlug(slug: string): Promise<AgentProfile | null>;
  create(agent: AgentProfile): Promise<AgentProfile>;
  update(agent: AgentProfile): Promise<AgentProfile>;
}

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  findBySlug(slug: string): Promise<Project | null>;
  create(project: Project): Promise<Project>;
  update(project: Project): Promise<Project>;
  listMembers(projectId: string): Promise<readonly ProjectMember[]>;
  listAgents(projectId: string): Promise<readonly ProjectAgent[]>;
}

export interface ProjectHarnessRepository {
  listByProjectId(projectId: string): Promise<readonly ProjectHarness[]>;
  create(harness: ProjectHarness): Promise<ProjectHarness>;
  update(harness: ProjectHarness): Promise<ProjectHarness>;
}

export interface ArtifactRepository {
  findById(id: string): Promise<Artifact | null>;
  listByProjectId(projectId: string): Promise<readonly Artifact[]>;
  create(artifact: Artifact): Promise<Artifact>;
  update(artifact: Artifact): Promise<Artifact>;
}

export interface EvidenceRepository {
  listByProjectId(projectId: string): Promise<readonly ProjectEvidence[]>;
  create(evidence: ProjectEvidence): Promise<ProjectEvidence>;
}

export interface ContributionRepository {
  listByProjectId(projectId: string): Promise<readonly ContributionCredit[]>;
  listByMembershipId(
    membershipId: string,
  ): Promise<readonly ContributionCredit[]>;
  listByAgentId(agentId: string): Promise<readonly ContributionCredit[]>;
  create(contribution: ContributionCredit): Promise<ContributionCredit>;
}
