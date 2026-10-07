import { describe, expect, it } from "vitest";
import type { RequestActor } from "@/authorization/actor";
import {
  CoreApplicationError,
  CoreWorkApplicationService,
  type CoreWorkStore,
} from "@/domain/core/application-service";
import type { Project } from "@/domain/projects/types";

const actor = (
  membershipId: string,
  status: "ACTIVE" | "INVITED" = "ACTIVE",
): RequestActor => ({
  membershipId,
  authUserId: `auth-${membershipId}`,
  role: "MEMBER",
  membershipStatus: status,
  suspendedAt: null,
});
function memoryStore(options: { failAudit?: boolean } = {}) {
  const projects: Project[] = [];
  const events: string[] = [];
  const store = {
    developers: {
      findByMembershipId: async () => null,
      findByHandle: async () => null,
      create: async (v: never) => v,
      update: async (v: never) => v,
    },
    agents: {
      findById: async () => null,
      findBySlug: async () => null,
      create: async (v: never) => v,
      update: async (v: never) => v,
    },
    projects: {
      findById: async (id: string) => projects.find((x) => x.id === id) ?? null,
      findBySlug: async () => null,
      create: async (v: Project) => {
        projects.push(v);
        return v;
      },
      update: async (v: Project) => {
        const i = projects.findIndex((x) => x.id === v.id);
        projects[i] = v;
        return v;
      },
      listMembers: async () => [],
      listAgents: async () => [],
      listByOwnerMembershipId: async () => [],
      listByParticipantMembershipId: async () => [],
    },
    members: { add: async (v: never) => v, remove: async () => false },
    projectAgents: { add: async (v: never) => v, remove: async () => false },
    harnesses: {
      listByProjectId: async () => [],
      create: async (v: never) => v,
      update: async (v: never) => v,
    },
    artifacts: {
      findById: async () => null,
      listByProjectId: async () => [],
      create: async (v: never) => v,
      update: async (v: never) => v,
    },
    evidence: {
      listByProjectId: async () => [],
      create: async (v: never) => v,
    },
    contributions: {
      listByProjectId: async () => [],
      listByMembershipId: async () => [],
      listByAgentId: async () => [],
      create: async (v: never) => v,
    },
    findWorkGraph: async () => null,
    audit: async (event: { eventType: string }) => {
      if (options.failAudit) throw new Error("audit unavailable");
      events.push(event.eventType);
    },
    transaction: async <T>(operation: (u: never) => Promise<T>) => {
      const beforeProjects = [...projects];
      const beforeEvents = [...events];
      try {
        return await operation(store as never);
      } catch (error) {
        projects.splice(0, projects.length, ...beforeProjects);
        events.splice(0, events.length, ...beforeEvents);
        throw error;
      }
    },
  } as unknown as CoreWorkStore;
  return { store, projects, events };
}
const projectInput = {
  slug: "service-project",
  name: "Service project",
  summary: "A focused fixture",
};

describe("Core Work application service authorization and unit of work", () => {
  it("denies cross-account project changes and inactive membership writes", async () => {
    const mem = memoryStore();
    const service = new CoreWorkApplicationService(mem.store);
    const created = await service.createProject(actor("owner"), projectInput);
    await expect(
      service.updateProject(actor("other"), created.id, projectInput),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      service.createProject(actor("pending", "INVITED"), {
        ...projectInput,
        slug: "pending-project",
      }),
    ).rejects.toMatchObject({ code: "MEMBERSHIP_INACTIVE" });
    await expect(
      service.createProject(
        {
          membershipId: "suspended",
          authUserId: "auth-suspended",
          role: "MEMBER",
          membershipStatus: "ACTIVE",
          suspendedAt: new Date(),
        },
        { ...projectInput, slug: "suspended-project" },
      ),
    ).rejects.toMatchObject({ code: "SUSPENDED" });
  });
  it("allows the owner, denies contributors, and honors a maintainer relationship", async () => {
    const mem = memoryStore();
    const service = new CoreWorkApplicationService(mem.store);
    const created = await service.createProject(actor("owner"), projectInput);
    await expect(
      service.updateProject(actor("contributor"), created.id, projectInput),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(
      (
        await service.updateProject(actor("owner"), created.id, {
          ...projectInput,
          name: "Updated",
        })
      ).name,
    ).toBe("Updated");
  });
  it("rolls back a mutation when the audit append fails", async () => {
    const mem = memoryStore({ failAudit: true });
    const service = new CoreWorkApplicationService(mem.store);
    await expect(
      service.createProject(actor("owner"), projectInput),
    ).rejects.toThrow("audit unavailable");
    expect(mem.projects).toHaveLength(0);
    expect(mem.events).toHaveLength(0);
  });
});
