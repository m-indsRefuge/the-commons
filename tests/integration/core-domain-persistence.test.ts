import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeDatabase, getDatabase } from "@/infrastructure/database/client";
import { auditEvents, memberships } from "@/infrastructure/database/schema";
import {
  DrizzleAgentProfileRepository,
  DrizzleArtifactRepository,
  DrizzleContributionRepository,
  DrizzleProjectAgentRepository,
  DrizzleProjectHarnessRepository,
  DrizzleProjectMemberRepository,
  DrizzleProjectRepository,
  DrizzleEvidenceRepository,
} from "@/infrastructure/database/core/drizzle-repositories";
import { DrizzleCoreDomainAuditPersistence } from "@/infrastructure/database/core/audit-persistence";
import { withCoreDomainTransaction } from "@/infrastructure/database/core/database-executor";
import { DrizzleProjectWorkGraphReadModel } from "@/infrastructure/database/core/work-graph-read-model";

async function resetTables() {
  await getDatabase().execute(
    sql.raw(
      'TRUNCATE TABLE "audit_event", "contribution_credit", "project_evidence", "artifact", "project_harness", "project_agent", "project_member", "project", "agent_profile", "developer_profile", "invite", "commons_membership" CASCADE',
    ),
  );
}

async function createMembership(authUserId: string) {
  const [row] = await getDatabase()
    .insert(memberships)
    .values({
      authUserId,
      status: "ACTIVE",
      role: "MEMBER",
      admittedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error("Membership fixture insert failed.");
  return row;
}

async function createProject(
  ownerMembershipId: string,
  slug = "graph-project",
) {
  return new DrizzleProjectRepository().create({
    id: crypto.randomUUID(),
    ownerMembershipId,
    slug,
    name: "Graph Project",
    summary: "Integration fixture",
    description: null,
    homepageUrl: null,
    repositoryUrl: null,
    status: "ACTIVE",
    visibility: "MEMBERS",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

afterAll(async () => closeDatabase());
beforeEach(async () => resetTables());

describe("Core Domain Drizzle persistence", () => {
  it("enforces Project slug uniqueness and membership foreign keys", async () => {
    const owner = await createMembership("owner");
    await createProject(owner.id, "unique-project");
    await expect(
      createProject(owner.id, "unique-project"),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      createProject(crypto.randomUUID(), "missing-owner"),
    ).rejects.toMatchObject({ code: "MISSING_REFERENCE" });
  });

  it("keeps provenance records when a Project is archived", async () => {
    const owner = await createMembership("archive-owner");
    const project = await createProject(owner.id, "archive-project");
    const artifactRepository = new DrizzleArtifactRepository();
    await artifactRepository.create({
      id: crypto.randomUUID(),
      projectId: project.id,
      createdByMembershipId: owner.id,
      kind: "DOCUMENT",
      title: "Evidence source",
      summary: null,
      uri: null,
      contentHash: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const archived = await new DrizzleProjectRepository().update({
      ...project,
      status: "ARCHIVED",
    });
    expect(archived.status).toBe("ARCHIVED");
    expect(await artifactRepository.listByProjectId(project.id)).toHaveLength(
      1,
    );
  });

  it("assembles project members, linked Agents, harness, artifacts, evidence and human-backed Agent credits", async () => {
    const owner = await createMembership("graph-owner");
    const contributor = await createMembership("graph-contributor");
    const project = await createProject(owner.id);
    const agent = await new DrizzleAgentProfileRepository().create({
      id: crypto.randomUUID(),
      operatorMembershipId: owner.id,
      slug: "graph-agent",
      name: "Graph Agent",
      summary: null,
      modelProvider: null,
      modelName: null,
      runtime: null,
      harness: null,
      capabilities: [],
      status: "ACTIVE",
      visibility: "MEMBERS",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await new DrizzleProjectMemberRepository().add({
      projectId: project.id,
      membershipId: contributor.id,
      role: "CONTRIBUTOR",
      addedByMembershipId: owner.id,
      createdAt: new Date(),
    });
    await new DrizzleProjectAgentRepository().add({
      projectId: project.id,
      agentId: agent.id,
      relationship: "assistant",
      linkedByMembershipId: owner.id,
      createdAt: new Date(),
    });
    await new DrizzleProjectHarnessRepository().create({
      id: crypto.randomUUID(),
      projectId: project.id,
      recordedByMembershipId: owner.id,
      name: "Test harness",
      runtime: null,
      version: null,
      description: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const artifact = await new DrizzleArtifactRepository().create({
      id: crypto.randomUUID(),
      projectId: project.id,
      createdByMembershipId: owner.id,
      kind: "DOCUMENT",
      title: "Design",
      summary: null,
      uri: null,
      contentHash: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await new DrizzleEvidenceRepository().create({
      id: crypto.randomUUID(),
      projectId: project.id,
      artifactId: artifact.id,
      recordedByMembershipId: owner.id,
      kind: "TEST",
      title: "Test run",
      summary: null,
      uri: null,
      observedAt: null,
      metadata: {},
      createdAt: new Date(),
    });
    await new DrizzleContributionRepository().create({
      id: crypto.randomUUID(),
      projectId: project.id,
      contributorMembershipId: contributor.id,
      recordedByMembershipId: owner.id,
      attributedAgentId: agent.id,
      artifactId: artifact.id,
      kind: "CODE",
      summary: "Implemented work",
      evidenceUri: null,
      occurredAt: null,
      createdAt: new Date(),
    });
    const graph = await new DrizzleProjectWorkGraphReadModel().findByProjectId(
      project.id,
    );
    expect(graph).not.toBeNull();
    expect(graph?.members).toHaveLength(1);
    expect(graph?.agents[0]?.profile.operatorMembershipId).toBe(owner.id);
    expect(graph?.harnesses).toHaveLength(1);
    expect(graph?.artifacts).toHaveLength(1);
    expect(graph?.evidence[0]?.recordedByMembershipId).toBe(owner.id);
    expect(graph?.contributions[0]).toMatchObject({
      contributorMembershipId: contributor.id,
      recordedByMembershipId: owner.id,
      attributedAgentId: agent.id,
    });
    expect(
      await new DrizzleProjectWorkGraphReadModel().findByProjectId(
        crypto.randomUUID(),
      ),
    ).toBeNull();
  });

  it("rolls back Project and audit rows together on a failed transaction", async () => {
    const owner = await createMembership("rollback-owner");
    const projectId = crypto.randomUUID();
    await expect(
      withCoreDomainTransaction(getDatabase(), async (executor) => {
        const project = await new DrizzleProjectRepository(executor).create({
          id: projectId,
          ownerMembershipId: owner.id,
          slug: "rolled-back",
          name: "Rollback",
          summary: "Fixture",
          description: null,
          homepageUrl: null,
          repositoryUrl: null,
          status: "DRAFT",
          visibility: "PRIVATE",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await new DrizzleCoreDomainAuditPersistence(executor).append({
          actorMembershipId: owner.id,
          eventType: "project.created",
          targetType: "project",
          targetId: project.id,
        });
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");
    expect(await new DrizzleProjectRepository().findById(projectId)).toBeNull();
    const auditRows = await getDatabase().select().from(auditEvents);
    expect(auditRows).toHaveLength(0);
  });
});
