import { eq } from "drizzle-orm";

import type { AgentProfile } from "@/domain/agents/types";
import type { Artifact } from "@/domain/artifacts/types";
import type { ContributionCredit } from "@/domain/contributions/types";
import type { ProjectEvidence } from "@/domain/evidence/types";
import type {
  Project,
  ProjectAgent,
  ProjectHarness,
  ProjectMember,
} from "@/domain/projects/types";

import { getDatabase } from "../client";
import type { CoreDomainExecutor } from "./database-executor";
import {
  agentProfiles,
  artifacts,
  contributionCredits,
  projectAgents,
  projectEvidence,
  projectHarnesses,
  projectMembers,
  projects,
} from "../schema";

export interface ProjectWorkGraph {
  project: Project;
  members: readonly ProjectMember[];
  agents: readonly { relationship: ProjectAgent; profile: AgentProfile }[];
  harnesses: readonly ProjectHarness[];
  artifacts: readonly Artifact[];
  evidence: readonly ProjectEvidence[];
  contributions: readonly ContributionCredit[];
}

export class DrizzleProjectWorkGraphReadModel {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  async findByProjectId(projectId: string): Promise<ProjectWorkGraph | null> {
    const [project] = await this.database
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project) return null;

    const [
      members,
      linkedAgents,
      harnesses,
      artifactRows,
      evidence,
      contributions,
    ] = await Promise.all([
      this.database
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.projectId, projectId)),
      this.database
        .select({ relationship: projectAgents, profile: agentProfiles })
        .from(projectAgents)
        .innerJoin(agentProfiles, eq(projectAgents.agentId, agentProfiles.id))
        .where(eq(projectAgents.projectId, projectId)),
      this.database
        .select()
        .from(projectHarnesses)
        .where(eq(projectHarnesses.projectId, projectId)),
      this.database
        .select()
        .from(artifacts)
        .where(eq(artifacts.projectId, projectId)),
      this.database
        .select()
        .from(projectEvidence)
        .where(eq(projectEvidence.projectId, projectId)),
      this.database
        .select()
        .from(contributionCredits)
        .where(eq(contributionCredits.projectId, projectId)),
    ]);

    return {
      project,
      members,
      agents: linkedAgents,
      harnesses,
      artifacts: artifactRows,
      evidence,
      contributions,
    };
  }
}
