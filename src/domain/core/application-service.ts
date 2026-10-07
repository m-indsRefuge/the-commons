import type { RequestActor } from "@/authorization/actor";
import {
  canReadCoreContent,
  requireAgentOperator,
  requireContributionRecorder,
  requireDeveloperProfileOwner,
  requireProjectManager,
} from "@/authorization/core-domain-policy";
import type { AgentProfile } from "@/domain/agents/types";
import type { Artifact } from "@/domain/artifacts/types";
import type {
  ContributionCredit,
  ContributionKind,
} from "@/domain/contributions/types";
import type { DeveloperProfile } from "@/domain/developers/types";
import type { ProjectEvidence } from "@/domain/evidence/types";
import {
  hasAccountableAgentOperator,
  hasCanonicalProjectOwner,
  hasHumanContributionAuthority,
  isValidDeveloperHandle,
  isValidSlug,
  normalizeHandle,
  normalizeSlug,
} from "@/domain/core/invariants";
import type { ContentVisibility, RecordStatus } from "@/domain/core/types";
import type {
  Project,
  ProjectAgent,
  ProjectHarness,
  ProjectMember,
  ProjectMemberRole,
} from "@/domain/projects/types";
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
import type { ProjectWorkGraph } from "@/infrastructure/database/core/work-graph-read-model";

export type CoreApplicationErrorCode =
  | "UNAUTHENTICATED"
  | "MEMBERSHIP_INACTIVE"
  | "SUSPENDED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "MISSING_REFERENCE"
  | "INVALID_INPUT";
export class CoreApplicationError extends Error {
  constructor(
    readonly code: CoreApplicationErrorCode,
    message = code,
  ) {
    super(message);
    this.name = "CoreApplicationError";
  }
}
export interface CoreWorkUnitOfWork {
  developers: DeveloperProfileRepository;
  agents: AgentProfileRepository;
  projects: ProjectRepository;
  members: ProjectMemberRepository;
  projectAgents: ProjectAgentRepository;
  harnesses: ProjectHarnessRepository;
  artifacts: ArtifactRepository;
  evidence: EvidenceRepository;
  contributions: ContributionRepository;
  findWorkGraph(projectId: string): Promise<ProjectWorkGraph | null>;
  audit(event: {
    actorMembershipId: string;
    eventType: string;
    targetType: string;
    targetId: string;
    correlationId?: string;
  }): Promise<void>;
}
export interface CoreWorkStore extends CoreWorkUnitOfWork {
  transaction<T>(
    operation: (unit: CoreWorkUnitOfWork) => Promise<T>,
  ): Promise<T>;
}
export interface ProfileInput {
  handle: string;
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  skills?: readonly string[];
  focusAreas?: readonly string[];
  visibility?: ContentVisibility;
}
export interface AgentInput {
  slug: string;
  name: string;
  summary?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  runtime?: string | null;
  harness?: string | null;
  capabilities?: readonly string[];
  status?: RecordStatus;
  visibility?: ContentVisibility;
}
export interface ProjectInput {
  slug: string;
  name: string;
  summary: string;
  description?: string | null;
  homepageUrl?: string | null;
  repositoryUrl?: string | null;
  status?: RecordStatus;
  visibility?: ContentVisibility;
}
function fail(code: CoreApplicationErrorCode): never {
  throw new CoreApplicationError(code);
}
function member(actor: RequestActor): string {
  if (!actor.membershipId) fail("UNAUTHENTICATED");
  if (actor.suspendedAt) fail("SUSPENDED");
  if (actor.membershipStatus !== "ACTIVE") fail("MEMBERSHIP_INACTIVE");
  return actor.membershipId;
}
function allowed(decision: { allowed: boolean; reason?: string }): void {
  if (decision.allowed) return;
  const r = decision.reason;
  if (
    r === "UNAUTHENTICATED" ||
    r === "SUSPENDED" ||
    r === "MEMBERSHIP_INACTIVE"
  )
    fail(r);
  fail("FORBIDDEN");
}
function slug(value: string): string {
  const v = normalizeSlug(value);
  if (!isValidSlug(v)) fail("INVALID_INPUT");
  return v;
}
function handle(value: string): string {
  const v = normalizeHandle(value);
  if (!isValidDeveloperHandle(v)) fail("INVALID_INPUT");
  return v;
}
function visibilityRead(
  actor: RequestActor,
  visibility: ContentVisibility,
  ids: readonly string[],
): void {
  allowed(canReadCoreContent(actor, visibility, ids));
}
const now = () => new Date();
const newId = () => crypto.randomUUID();

export class CoreWorkApplicationService {
  constructor(private readonly store: CoreWorkStore) {}
  private run<T>(
    actor: RequestActor,
    eventType: string,
    targetType: string,
    operation: (unit: CoreWorkUnitOfWork, membershipId: string) => Promise<T>,
  ): Promise<T> {
    const membershipId = member(actor);
    return this.store.transaction(async (unit) => {
      const result = await operation(unit, membershipId);
      const targetId =
        typeof result === "object" && result !== null && "id" in result
          ? String((result as { id: unknown }).id)
          : "relationship";
      await unit.audit({
        actorMembershipId: membershipId,
        eventType,
        targetType,
        targetId,
      });
      return result;
    });
  }
  async readDeveloper(
    actor: RequestActor,
    membershipId: string,
  ): Promise<DeveloperProfile | null> {
    const p = await this.store.developers.findByMembershipId(membershipId);
    if (p) visibilityRead(actor, p.visibility, [membershipId]);
    else if (actor.membershipId !== membershipId)
      allowed(canReadCoreContent(actor, "PRIVATE", []));
    return p;
  }
  async readDeveloperByHandle(
    actor: RequestActor,
    value: string,
  ): Promise<DeveloperProfile | null> {
    const p = await this.store.developers.findByHandle(handle(value));
    if (p) visibilityRead(actor, p.visibility, [p.membershipId]);
    return p;
  }
  async createDeveloper(
    actor: RequestActor,
    input: ProfileInput,
  ): Promise<DeveloperProfile> {
    return this.run(
      actor,
      "developer_profile.created",
      "developer_profile",
      async (u, membershipId) => {
        if (await u.developers.findByMembershipId(membershipId))
          fail("CONFLICT");
        const displayName = input.displayName.trim();
        if (!displayName) fail("INVALID_INPUT");
        return u.developers.create({
          id: newId(),
          membershipId,
          handle: handle(input.handle),
          displayName,
          headline: input.headline?.trim() || null,
          bio: input.bio?.trim() || null,
          skills: input.skills ?? [],
          focusAreas: input.focusAreas ?? [],
          visibility: input.visibility ?? "MEMBERS",
          createdAt: now(),
          updatedAt: now(),
        });
      },
    );
  }
  async updateDeveloper(
    actor: RequestActor,
    input: ProfileInput,
  ): Promise<DeveloperProfile> {
    return this.run(
      actor,
      "developer_profile.updated",
      "developer_profile",
      async (u, membershipId) => {
        allowed(requireDeveloperProfileOwner(actor, membershipId));
        const old = await u.developers.findByMembershipId(membershipId);
        if (!old) fail("NOT_FOUND");
        const displayName = input.displayName.trim();
        if (!displayName) fail("INVALID_INPUT");
        return u.developers.update({
          ...old,
          handle: handle(input.handle),
          displayName,
          headline: input.headline?.trim() || null,
          bio: input.bio?.trim() || null,
          skills: input.skills ?? old.skills,
          focusAreas: input.focusAreas ?? old.focusAreas,
          visibility: input.visibility ?? old.visibility,
          updatedAt: now(),
        });
      },
    );
  }
  async createAgent(
    actor: RequestActor,
    input: AgentInput,
  ): Promise<AgentProfile> {
    return this.run(
      actor,
      "agent_profile.created",
      "agent_profile",
      async (u, operatorMembershipId) => {
        if (!hasAccountableAgentOperator(operatorMembershipId))
          fail("INVALID_INPUT");
        const name = input.name.trim();
        if (!name) fail("INVALID_INPUT");
        return u.agents.create({
          id: newId(),
          operatorMembershipId,
          slug: slug(input.slug),
          name,
          summary: input.summary?.trim() || null,
          modelProvider: input.modelProvider ?? null,
          modelName: input.modelName ?? null,
          runtime: input.runtime ?? null,
          harness: input.harness ?? null,
          capabilities: input.capabilities ?? [],
          status: input.status ?? "DRAFT",
          visibility: input.visibility ?? "MEMBERS",
          createdAt: now(),
          updatedAt: now(),
        });
      },
    );
  }
  async readAgent(actor: RequestActor, id: string): Promise<AgentProfile> {
    const v = await this.store.agents.findById(id);
    if (!v) fail("NOT_FOUND");
    visibilityRead(actor, v.visibility, [v.operatorMembershipId]);
    return v;
  }
  async readAgentBySlug(
    actor: RequestActor,
    value: string,
  ): Promise<AgentProfile | null> {
    const v = await this.store.agents.findBySlug(slug(value));
    if (v) visibilityRead(actor, v.visibility, [v.operatorMembershipId]);
    return v;
  }
  async updateAgent(
    actor: RequestActor,
    id: string,
    input: AgentInput,
  ): Promise<AgentProfile> {
    return this.run(
      actor,
      "agent_profile.updated",
      "agent_profile",
      async (u) => {
        const old = await u.agents.findById(id);
        if (!old) fail("NOT_FOUND");
        allowed(requireAgentOperator(actor, old.operatorMembershipId));
        const name = input.name.trim();
        if (!name) fail("INVALID_INPUT");
        return u.agents.update({
          ...old,
          slug: slug(input.slug),
          name,
          summary: input.summary?.trim() || null,
          modelProvider: input.modelProvider ?? null,
          modelName: input.modelName ?? null,
          runtime: input.runtime ?? null,
          harness: input.harness ?? null,
          capabilities: input.capabilities ?? old.capabilities,
          status: input.status ?? old.status,
          visibility: input.visibility ?? old.visibility,
          updatedAt: now(),
        });
      },
    );
  }
  async archiveAgent(actor: RequestActor, id: string): Promise<AgentProfile> {
    return this.run(
      actor,
      "agent_profile.archived",
      "agent_profile",
      async (u) => {
        const old = await u.agents.findById(id);
        if (!old) fail("NOT_FOUND");
        allowed(requireAgentOperator(actor, old.operatorMembershipId));
        return u.agents.update({
          ...old,
          status: "ARCHIVED",
          updatedAt: now(),
        });
      },
    );
  }
  async createProject(
    actor: RequestActor,
    input: ProjectInput,
  ): Promise<Project> {
    return this.run(
      actor,
      "project.created",
      "project",
      async (u, ownerMembershipId) => {
        if (!hasCanonicalProjectOwner(ownerMembershipId)) fail("INVALID_INPUT");
        const name = input.name.trim(),
          summary = input.summary.trim();
        if (!name || !summary) fail("INVALID_INPUT");
        return u.projects.create({
          id: newId(),
          ownerMembershipId,
          slug: slug(input.slug),
          name,
          summary,
          description: input.description?.trim() || null,
          homepageUrl: input.homepageUrl ?? null,
          repositoryUrl: input.repositoryUrl ?? null,
          status: input.status ?? "DRAFT",
          visibility: input.visibility ?? "MEMBERS",
          createdAt: now(),
          updatedAt: now(),
        });
      },
    );
  }
  async readProject(actor: RequestActor, id: string): Promise<Project> {
    const v = await this.store.projects.findById(id);
    if (!v) fail("NOT_FOUND");
    const ms = await this.store.projects.listMembers(id);
    visibilityRead(actor, v.visibility, [
      v.ownerMembershipId,
      ...ms.map((x) => x.membershipId),
    ]);
    return v;
  }
  private async manager(
    actor: RequestActor,
    u: CoreWorkUnitOfWork,
    p: Project,
  ): Promise<void> {
    allowed(
      requireProjectManager(actor, {
        ownerMembershipId: p.ownerMembershipId,
        maintainerMembershipIds: (await u.projects.listMembers(p.id))
          .filter((x) => x.role === "MAINTAINER")
          .map((x) => x.membershipId),
      }),
    );
  }
  async updateProject(
    actor: RequestActor,
    id: string,
    input: ProjectInput,
  ): Promise<Project> {
    return this.run(actor, "project.updated", "project", async (u) => {
      const old = await u.projects.findById(id);
      if (!old) fail("NOT_FOUND");
      await this.manager(actor, u, old);
      const name = input.name.trim(),
        summary = input.summary.trim();
      if (!name || !summary) fail("INVALID_INPUT");
      return u.projects.update({
        ...old,
        slug: slug(input.slug),
        name,
        summary,
        description: input.description?.trim() || null,
        homepageUrl: input.homepageUrl ?? null,
        repositoryUrl: input.repositoryUrl ?? null,
        status: input.status ?? old.status,
        visibility: input.visibility ?? old.visibility,
        updatedAt: now(),
      });
    });
  }
  async archiveProject(actor: RequestActor, id: string): Promise<Project> {
    return this.run(actor, "project.archived", "project", async (u) => {
      const old = await u.projects.findById(id);
      if (!old) fail("NOT_FOUND");
      await this.manager(actor, u, old);
      return u.projects.update({
        ...old,
        status: "ARCHIVED",
        updatedAt: now(),
      });
    });
  }
  async addProjectMember(
    actor: RequestActor,
    projectId: string,
    membershipId: string,
    role: ProjectMemberRole,
  ): Promise<ProjectMember> {
    return this.run(
      actor,
      "project_member.added",
      "project_member",
      async (u, addedByMembershipId) => {
        const p = await u.projects.findById(projectId);
        if (!p) fail("NOT_FOUND");
        await this.manager(actor, u, p);
        if (membershipId === p.ownerMembershipId) fail("INVALID_INPUT");
        return u.members.add({
          projectId,
          membershipId,
          role,
          addedByMembershipId,
          createdAt: now(),
        });
      },
    );
  }
  async removeProjectMember(
    actor: RequestActor,
    projectId: string,
    membershipId: string,
  ): Promise<boolean> {
    return this.run(
      actor,
      "project_member.removed",
      "project_member",
      async (u) => {
        const p = await u.projects.findById(projectId);
        if (!p) fail("NOT_FOUND");
        await this.manager(actor, u, p);
        if (membershipId === p.ownerMembershipId) fail("INVALID_INPUT");
        return u.members.remove(projectId, membershipId);
      },
    );
  }
  async linkAgent(
    actor: RequestActor,
    projectId: string,
    agentId: string,
    relationship?: string | null,
  ): Promise<ProjectAgent> {
    return this.run(
      actor,
      "project_agent.linked",
      "project_agent",
      async (u, linkedByMembershipId) => {
        const p = await u.projects.findById(projectId);
        if (!p) fail("NOT_FOUND");
        await this.manager(actor, u, p);
        if (!(await u.agents.findById(agentId))) fail("NOT_FOUND");
        return u.projectAgents.add({
          projectId,
          agentId,
          relationship: relationship?.trim() || null,
          linkedByMembershipId,
          createdAt: now(),
        });
      },
    );
  }
  async unlinkAgent(
    actor: RequestActor,
    projectId: string,
    agentId: string,
  ): Promise<boolean> {
    return this.run(
      actor,
      "project_agent.unlinked",
      "project_agent",
      async (u) => {
        const p = await u.projects.findById(projectId);
        if (!p) fail("NOT_FOUND");
        await this.manager(actor, u, p);
        return u.projectAgents.remove(projectId, agentId);
      },
    );
  }
  async createHarness(
    actor: RequestActor,
    projectId: string,
    input: Omit<
      ProjectHarness,
      "id" | "projectId" | "recordedByMembershipId" | "createdAt" | "updatedAt"
    >,
  ): Promise<ProjectHarness> {
    return this.run(
      actor,
      "project_harness.created",
      "project_harness",
      async (u, recordedByMembershipId) => {
        const p = await u.projects.findById(projectId);
        if (!p) fail("NOT_FOUND");
        await this.manager(actor, u, p);
        return u.harnesses.create({
          ...input,
          id: newId(),
          projectId,
          recordedByMembershipId,
          createdAt: now(),
          updatedAt: now(),
        });
      },
    );
  }
  async updateHarness(
    actor: RequestActor,
    projectId: string,
    harnessId: string,
    input: Partial<ProjectHarness>,
  ): Promise<ProjectHarness> {
    return this.run(
      actor,
      "project_harness.updated",
      "project_harness",
      async (u) => {
        const p = await u.projects.findById(projectId);
        if (!p) fail("NOT_FOUND");
        await this.manager(actor, u, p);
        const old = (await u.harnesses.listByProjectId(projectId)).find(
          (x) => x.id === harnessId,
        );
        if (!old) fail("NOT_FOUND");
        return u.harnesses.update({
          ...old,
          ...input,
          id: old.id,
          projectId,
          recordedByMembershipId: old.recordedByMembershipId,
          createdAt: old.createdAt,
          updatedAt: now(),
        });
      },
    );
  }
  async readHarnesses(
    actor: RequestActor,
    projectId: string,
  ): Promise<readonly ProjectHarness[]> {
    await this.readProject(actor, projectId);
    return this.store.harnesses.listByProjectId(projectId);
  }
  async createArtifact(
    actor: RequestActor,
    projectId: string,
    input: Omit<
      Artifact,
      "id" | "projectId" | "createdByMembershipId" | "createdAt" | "updatedAt"
    >,
  ): Promise<Artifact> {
    return this.run(
      actor,
      "artifact.created",
      "artifact",
      async (u, createdByMembershipId) => {
        const p = await u.projects.findById(projectId);
        if (!p) fail("NOT_FOUND");
        await this.manager(actor, u, p);
        return u.artifacts.create({
          ...input,
          id: newId(),
          projectId,
          createdByMembershipId,
          createdAt: now(),
          updatedAt: now(),
        });
      },
    );
  }
  async updateArtifact(
    actor: RequestActor,
    artifactId: string,
    input: Partial<Artifact>,
  ): Promise<Artifact> {
    return this.run(actor, "artifact.updated", "artifact", async (u) => {
      const old = await u.artifacts.findById(artifactId);
      if (!old) fail("NOT_FOUND");
      const p = await u.projects.findById(old.projectId);
      if (!p) fail("NOT_FOUND");
      await this.manager(actor, u, p);
      return u.artifacts.update({
        ...old,
        ...input,
        id: old.id,
        projectId: old.projectId,
        createdByMembershipId: old.createdByMembershipId,
        createdAt: old.createdAt,
        updatedAt: now(),
      });
    });
  }
  async readArtifacts(
    actor: RequestActor,
    projectId: string,
  ): Promise<readonly Artifact[]> {
    await this.readProject(actor, projectId);
    return this.store.artifacts.listByProjectId(projectId);
  }
  async createEvidence(
    actor: RequestActor,
    projectId: string,
    input: Omit<
      ProjectEvidence,
      "id" | "projectId" | "recordedByMembershipId" | "createdAt"
    >,
  ): Promise<ProjectEvidence> {
    return this.run(
      actor,
      "evidence.created",
      "project_evidence",
      async (u, recordedByMembershipId) => {
        const p = await u.projects.findById(projectId);
        if (!p) fail("NOT_FOUND");
        await this.manager(actor, u, p);
        return u.evidence.create({
          ...input,
          id: newId(),
          projectId,
          recordedByMembershipId,
          createdAt: now(),
        });
      },
    );
  }
  async readEvidence(
    actor: RequestActor,
    projectId: string,
  ): Promise<readonly ProjectEvidence[]> {
    await this.readProject(actor, projectId);
    return this.store.evidence.listByProjectId(projectId);
  }
  async createContribution(
    actor: RequestActor,
    projectId: string,
    contributorMembershipId: string,
    input: {
      attributedAgentId?: string | null;
      artifactId?: string | null;
      kind: ContributionKind;
      summary: string;
      evidenceUri?: string | null;
      occurredAt?: Date | null;
    },
  ): Promise<ContributionCredit> {
    return this.run(
      actor,
      "contribution_credit.created",
      "contribution_credit",
      async (u, recordedByMembershipId) => {
        const p = await u.projects.findById(projectId);
        if (!p) fail("NOT_FOUND");
        const managers = {
          ownerMembershipId: p.ownerMembershipId,
          maintainerMembershipIds: (await u.projects.listMembers(projectId))
            .filter((x) => x.role === "MAINTAINER")
            .map((x) => x.membershipId),
        };
        allowed(
          requireContributionRecorder(actor, contributorMembershipId, managers),
        );
        if (
          !hasHumanContributionAuthority({
            contributorMembershipId,
            recordedByMembershipId,
          })
        )
          fail("INVALID_INPUT");
        if (input.attributedAgentId) {
          const a = await u.agents.findById(input.attributedAgentId);
          if (!a) fail("NOT_FOUND");
          if (a.operatorMembershipId !== recordedByMembershipId)
            fail("FORBIDDEN");
        }
        return u.contributions.create({
          ...input,
          id: newId(),
          projectId,
          contributorMembershipId,
          recordedByMembershipId,
          attributedAgentId: input.attributedAgentId ?? null,
          artifactId: input.artifactId ?? null,
          evidenceUri: input.evidenceUri ?? null,
          occurredAt: input.occurredAt ?? null,
          createdAt: now(),
        });
      },
    );
  }
  async readContributions(
    actor: RequestActor,
    projectId: string,
  ): Promise<readonly ContributionCredit[]> {
    await this.readProject(actor, projectId);
    return this.store.contributions.listByProjectId(projectId);
  }
  async readWorkGraph(
    actor: RequestActor,
    projectId: string,
  ): Promise<ProjectWorkGraph> {
    const p = await this.readProject(actor, projectId);
    const graph = await this.store.findWorkGraph(projectId);
    if (!graph) fail("NOT_FOUND");
    visibilityRead(actor, p.visibility, [
      p.ownerMembershipId,
      ...graph.members.map((x) => x.membershipId),
    ]);
    return graph;
  }
}
