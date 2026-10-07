import { describe, expect, it } from "vitest";
import type { RequestActor } from "@/authorization/actor";
import {
  CoreWorkApplicationService,
  type CoreWorkStore,
} from "@/domain/core/application-service";
import type { AgentProfile } from "@/domain/agents/types";
import type { ContributionCredit } from "@/domain/contributions/types";
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
  const agents: AgentProfile[] = [];
  const members: {
    projectId: string;
    membershipId: string;
    role: "MAINTAINER" | "CONTRIBUTOR";
    addedByMembershipId: string;
    createdAt: Date;
  }[] = [];
  const contributions: ContributionCredit[] = [];
  const events: string[] = [];
  const store = {
    developers: {
      findByMembershipId: async () => null,
      findByHandle: async () => null,
      create: async (v: never) => v,
      update: async (v: never) => v,
    },
    agents: {
      findById: async (id: string) => agents.find((x) => x.id === id) ?? null,
      findBySlug: async () => null,
      create: async (v: AgentProfile) => {
        agents.push(v);
        return v;
      },
      update: async (v: AgentProfile) => {
        const i = agents.findIndex((x) => x.id === v.id);
        agents[i] = v;
        return v;
      },
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
      listMembers: async (id: string) =>
        members.filter((x) => x.projectId === id),
      listAgents: async () => [],
      listByOwnerMembershipId: async () => [],
      listByParticipantMembershipId: async () => [],
    },
    members: {
      add: async (v: (typeof members)[number]) => {
        members.push(v);
        return v;
      },
      remove: async () => false,
    },
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
      listByProjectId: async () => contributions,
      listByMembershipId: async () => [],
      listByAgentId: async () => [],
      create: async (v: ContributionCredit) => {
        contributions.push(v);
        return v;
      },
    },
    findWorkGraph: async () => null,
    audit: async (event: { eventType: string }) => {
      if (options.failAudit) throw new Error("audit unavailable");
      events.push(event.eventType);
    },
    transaction: async <T>(operation: (u: never) => Promise<T>) => {
      const ps = [...projects],
        as = [...agents],
        ms = [...members],
        cs = [...contributions],
        es = [...events];
      try {
        return await operation(store as never);
      } catch (error) {
        projects.splice(0, projects.length, ...ps);
        agents.splice(0, agents.length, ...as);
        members.splice(0, members.length, ...ms);
        contributions.splice(0, contributions.length, ...cs);
        events.splice(0, events.length, ...es);
        throw error;
      }
    },
  } as unknown as CoreWorkStore;
  return { store, projects, agents, members, contributions, events };
}
const projectInput = {
  slug: "service-project",
  name: "Service project",
  summary: "A focused fixture",
};
const agentInput = { slug: "service-agent", name: "Service Agent" };

describe("Core Work application service authorization and unit of work", () => {
  it("denies cross-account project changes and inactive or suspended writes", async () => {
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
  it("allows the owner and maintainer while denying a contributor from project management", async () => {
    const mem = memoryStore();
    const service = new CoreWorkApplicationService(mem.store);
    const project = await service.createProject(actor("owner"), projectInput);
    await service.addProjectMember(
      actor("owner"),
      project.id,
      "maintainer",
      "MAINTAINER",
    );
    await service.addProjectMember(
      actor("owner"),
      project.id,
      "contributor",
      "CONTRIBUTOR",
    );
    await expect(
      service.updateProject(actor("contributor"), project.id, projectInput),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(
      (
        await service.updateProject(actor("maintainer"), project.id, {
          ...projectInput,
          name: "Maintainer edit",
        })
      ).name,
    ).toBe("Maintainer edit");
    expect(
      (
        await service.updateProject(actor("owner"), project.id, {
          ...projectInput,
          name: "Owner edit",
        })
      ).name,
    ).toBe("Owner edit");
  });
  it("keeps Agent authority with its operator and human-backs Agent attribution", async () => {
    const mem = memoryStore();
    const service = new CoreWorkApplicationService(mem.store);
    const agent = await service.createAgent(actor("operator"), agentInput);
    await expect(
      service.updateAgent(actor("other"), agent.id, agentInput),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const project = await service.createProject(
      actor("operator"),
      projectInput,
    );
    const credit = await service.createContribution(
      actor("operator"),
      project.id,
      "human-contributor",
      {
        kind: "CODE",
        summary: "Implemented work",
        attributedAgentId: agent.id,
      },
    );
    expect(credit).toMatchObject({
      contributorMembershipId: "human-contributor",
      recordedByMembershipId: "operator",
      attributedAgentId: agent.id,
    });
    await expect(
      service.createContribution(
        actor("other"),
        project.id,
        "human-contributor",
        { kind: "CODE", summary: "Spoofed", attributedAgentId: agent.id },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
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
