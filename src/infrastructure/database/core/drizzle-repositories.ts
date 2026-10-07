import { and, desc, eq } from "drizzle-orm";

import type { AgentProfile } from "@/domain/agents/types";
import type { Artifact } from "@/domain/artifacts/types";
import type { ContributionCredit } from "@/domain/contributions/types";
import type { DeveloperProfile } from "@/domain/developers/types";
import type { ProjectEvidence } from "@/domain/evidence/types";
import type {
  AgentProfileRepository,
  ArtifactRepository,
  ContributionRepository,
  DeveloperProfileRepository,
  EvidenceRepository,
  ProjectAgentRepository,
  ProjectHarnessRepository,
  ProjectMemberRepository,
  ProjectRepository,
} from "@/domain/core/repositories";
import { normalizeHandle, normalizeSlug } from "@/domain/core/invariants";
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
  developerProfiles,
  projectAgents,
  projectEvidence,
  projectHarnesses,
  projectMembers,
  projects,
} from "../schema";
import { withCoreDomainPersistenceErrors } from "./persistence-error";

export class DrizzleDeveloperProfileRepository implements DeveloperProfileRepository {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  async findByMembershipId(id: string) {
    const [row] = await this.database
      .select()
      .from(developerProfiles)
      .where(eq(developerProfiles.membershipId, id))
      .limit(1);
    return row ?? null;
  }

  async findByHandle(handle: string) {
    const [row] = await this.database
      .select()
      .from(developerProfiles)
      .where(eq(developerProfiles.handle, normalizeHandle(handle)))
      .limit(1);
    return row ?? null;
  }

  create(value: DeveloperProfile) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .insert(developerProfiles)
        .values({
          ...value,
          handle: normalizeHandle(value.handle),
          skills: [...value.skills],
          focusAreas: [...value.focusAreas],
        })
        .returning();
      if (!row) throw new Error("Developer profile insert returned no row.");
      return row;
    });
  }

  update(value: DeveloperProfile) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .update(developerProfiles)
        .set({
          ...value,
          handle: normalizeHandle(value.handle),
          skills: [...value.skills],
          focusAreas: [...value.focusAreas],
          updatedAt: new Date(),
        })
        .where(eq(developerProfiles.id, value.id))
        .returning();
      if (!row) throw new Error("Developer profile was not found.");
      return row;
    });
  }
}

export class DrizzleAgentProfileRepository implements AgentProfileRepository {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  async findById(id: string) {
    const [row] = await this.database
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.id, id))
      .limit(1);
    return row ?? null;
  }

  async findBySlug(slug: string) {
    const [row] = await this.database
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.slug, normalizeSlug(slug)))
      .limit(1);
    return row ?? null;
  }

  create(value: AgentProfile) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .insert(agentProfiles)
        .values({
          ...value,
          slug: normalizeSlug(value.slug),
          capabilities: [...value.capabilities],
        })
        .returning();
      if (!row) throw new Error("Agent profile insert returned no row.");
      return row;
    });
  }

  update(value: AgentProfile) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .update(agentProfiles)
        .set({
          ...value,
          slug: normalizeSlug(value.slug),
          capabilities: [...value.capabilities],
          updatedAt: new Date(),
        })
        .where(eq(agentProfiles.id, value.id))
        .returning();
      if (!row) throw new Error("Agent profile was not found.");
      return row;
    });
  }
}

export class DrizzleProjectRepository implements ProjectRepository {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  async findById(id: string) {
    const [row] = await this.database
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return row ?? null;
  }

  async findBySlug(slug: string) {
    const [row] = await this.database
      .select()
      .from(projects)
      .where(eq(projects.slug, normalizeSlug(slug)))
      .limit(1);
    return row ?? null;
  }

  create(value: Project) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .insert(projects)
        .values({ ...value, slug: normalizeSlug(value.slug) })
        .returning();
      if (!row) throw new Error("Project insert returned no row.");
      return row;
    });
  }

  update(value: Project) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .update(projects)
        .set({
          ...value,
          slug: normalizeSlug(value.slug),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, value.id))
        .returning();
      if (!row) throw new Error("Project was not found.");
      return row;
    });
  }

  listMembers(id: string) {
    return this.database
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, id));
  }

  listAgents(id: string) {
    return this.database
      .select()
      .from(projectAgents)
      .where(eq(projectAgents.projectId, id));
  }

  listByOwnerMembershipId(id: string) {
    return this.database
      .select()
      .from(projects)
      .where(eq(projects.ownerMembershipId, id))
      .orderBy(desc(projects.updatedAt));
  }

  async listByParticipantMembershipId(id: string) {
    const rows = await this.database
      .select({ project: projects })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(eq(projectMembers.membershipId, id))
      .orderBy(desc(projects.updatedAt));
    return rows.map((row) => row.project);
  }
}

export class DrizzleProjectMemberRepository implements ProjectMemberRepository {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  add(value: ProjectMember) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .insert(projectMembers)
        .values(value)
        .returning();
      if (!row) throw new Error("Project member insert returned no row.");
      return row;
    });
  }

  async remove(projectId: string, membershipId: string) {
    const rows = await this.database
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.membershipId, membershipId),
        ),
      )
      .returning({ projectId: projectMembers.projectId });
    return rows.length === 1;
  }
}

export class DrizzleProjectAgentRepository implements ProjectAgentRepository {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  add(value: ProjectAgent) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .insert(projectAgents)
        .values(value)
        .returning();
      if (!row) throw new Error("Project Agent insert returned no row.");
      return row;
    });
  }

  async remove(projectId: string, agentId: string) {
    const rows = await this.database
      .delete(projectAgents)
      .where(
        and(
          eq(projectAgents.projectId, projectId),
          eq(projectAgents.agentId, agentId),
        ),
      )
      .returning({ projectId: projectAgents.projectId });
    return rows.length === 1;
  }
}

export class DrizzleProjectHarnessRepository implements ProjectHarnessRepository {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  listByProjectId(id: string) {
    return this.database
      .select()
      .from(projectHarnesses)
      .where(eq(projectHarnesses.projectId, id));
  }

  create(value: ProjectHarness) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .insert(projectHarnesses)
        .values({ ...value, metadata: { ...value.metadata } })
        .returning();
      if (!row) throw new Error("Project Harness insert returned no row.");
      return row;
    });
  }

  update(value: ProjectHarness) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .update(projectHarnesses)
        .set({
          ...value,
          metadata: { ...value.metadata },
          updatedAt: new Date(),
        })
        .where(eq(projectHarnesses.id, value.id))
        .returning();
      if (!row) throw new Error("Project Harness was not found.");
      return row;
    });
  }
}

export class DrizzleArtifactRepository implements ArtifactRepository {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  async findById(id: string) {
    const [row] = await this.database
      .select()
      .from(artifacts)
      .where(eq(artifacts.id, id))
      .limit(1);
    return row ?? null;
  }

  listByProjectId(id: string) {
    return this.database
      .select()
      .from(artifacts)
      .where(eq(artifacts.projectId, id))
      .orderBy(desc(artifacts.createdAt));
  }

  create(value: Artifact) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .insert(artifacts)
        .values({ ...value, metadata: { ...value.metadata } })
        .returning();
      if (!row) throw new Error("Artifact insert returned no row.");
      return row;
    });
  }

  update(value: Artifact) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .update(artifacts)
        .set({
          ...value,
          metadata: { ...value.metadata },
          updatedAt: new Date(),
        })
        .where(eq(artifacts.id, value.id))
        .returning();
      if (!row) throw new Error("Artifact was not found.");
      return row;
    });
  }
}

export class DrizzleEvidenceRepository implements EvidenceRepository {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  listByProjectId(id: string) {
    return this.database
      .select()
      .from(projectEvidence)
      .where(eq(projectEvidence.projectId, id))
      .orderBy(desc(projectEvidence.createdAt));
  }

  create(value: ProjectEvidence) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .insert(projectEvidence)
        .values({ ...value, metadata: { ...value.metadata } })
        .returning();
      if (!row) throw new Error("Project Evidence insert returned no row.");
      return row;
    });
  }
}

export class DrizzleContributionRepository implements ContributionRepository {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  listByProjectId(id: string) {
    return this.database
      .select()
      .from(contributionCredits)
      .where(eq(contributionCredits.projectId, id))
      .orderBy(desc(contributionCredits.createdAt));
  }

  listByMembershipId(id: string) {
    return this.database
      .select()
      .from(contributionCredits)
      .where(eq(contributionCredits.contributorMembershipId, id))
      .orderBy(desc(contributionCredits.createdAt));
  }

  listByAgentId(id: string) {
    return this.database
      .select()
      .from(contributionCredits)
      .where(eq(contributionCredits.attributedAgentId, id))
      .orderBy(desc(contributionCredits.createdAt));
  }

  create(value: ContributionCredit) {
    return withCoreDomainPersistenceErrors(async () => {
      const [row] = await this.database
        .insert(contributionCredits)
        .values(value)
        .returning();
      if (!row) throw new Error("Contribution Credit insert returned no row.");
      return row;
    });
  }
}
