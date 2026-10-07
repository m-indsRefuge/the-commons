import { randomUUID } from "node:crypto";
import type { RequestActor } from "@/authorization/actor";
import { CoreApplicationError } from "@/domain/core/application-service";
import { resolveRequestActor } from "@/infrastructure/auth/session-actor";
import { createCoreWorkService } from "@/infrastructure/core/service-factory";

type Json = Record<string, unknown>;
const json = (value: unknown, status = 200) => Response.json(value, { status });
async function body(request: Request): Promise<Json> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Json;
  } catch {
    throw new CoreApplicationError("INVALID_INPUT");
  }
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new CoreApplicationError("INVALID_INPUT");
  return value.trim();
}
function actorRequired(
  actor: RequestActor,
): asserts actor is Exclude<RequestActor, { membershipId: null }> {
  if (!actor.membershipId) throw new CoreApplicationError("UNAUTHENTICATED");
}
function status(code: string): number {
  return (
    (
      {
        UNAUTHENTICATED: 401,
        MEMBERSHIP_INACTIVE: 403,
        SUSPENDED: 403,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        MISSING_REFERENCE: 400,
        INVALID_INPUT: 400,
      } as Record<string, number>
    )[code] ?? 500
  );
}
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return dispatch(request, context, "GET");
}
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return dispatch(request, context, "POST");
}
export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return dispatch(request, context, "PUT");
}
export async function PATCH(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return dispatch(request, context, "PATCH");
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return dispatch(request, context, "DELETE");
}
async function dispatch(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  method: string,
): Promise<Response> {
  try {
    const actor = await resolveRequestActor(request.headers);
    const service = createCoreWorkService();
    const parts = (await context.params).path;
    const route = parts.join("/");
    const b =
      method === "GET" || method === "DELETE" ? {} : await body(request);
    if (route === "developers/me") {
      actorRequired(actor);
      if (method === "GET")
        return json({
          profile: await service.readDeveloper(actor, actor.membershipId),
        });
      if (method === "POST")
        return json(
          { profile: await service.createDeveloper(actor, b as never) },
          201,
        );
      if (method === "PUT" || method === "PATCH")
        return json({
          profile: await service.updateDeveloper(actor, b as never),
        });
    }
    if (parts[0] === "developers" && parts[1] === "handle" && method === "GET")
      return json({
        profile: await service.readDeveloperByHandle(actor, parts[2] ?? ""),
      });
    if (route === "agents" && method === "POST") {
      actorRequired(actor);
      return json({ agent: await service.createAgent(actor, b as never) }, 201);
    }
    if (parts[0] === "agents" && parts.length === 2) {
      if (method === "GET")
        return json({ agent: await service.readAgent(actor, parts[1]!) });
      if (method === "PUT" || method === "PATCH")
        return json({
          agent: await service.updateAgent(actor, parts[1]!, b as never),
        });
      if (
        method === "DELETE" ||
        (method === "POST" && b["action"] === "archive")
      )
        return json({ agent: await service.archiveAgent(actor, parts[1]!) });
    }
    if (parts[0] === "agents" && parts[1] === "slug" && method === "GET")
      return json({
        agent: await service.readAgentBySlug(actor, parts[2] ?? ""),
      });
    if (route === "projects" && method === "POST") {
      actorRequired(actor);
      return json(
        { project: await service.createProject(actor, b as never) },
        201,
      );
    }
    if (parts[0] === "projects" && parts.length >= 2) {
      const projectId = parts[1]!;
      if (parts.length === 2) {
        if (method === "GET")
          return json({ project: await service.readProject(actor, projectId) });
        if (method === "PUT" || method === "PATCH")
          return json({
            project: await service.updateProject(actor, projectId, b as never),
          });
        if (
          method === "DELETE" ||
          (method === "POST" && b["action"] === "archive")
        )
          return json({
            project: await service.archiveProject(actor, projectId),
          });
      }
      if (parts[2] === "members") {
        if (method === "GET") {
          const g = await service.readWorkGraph(actor, projectId);
          return json({ members: g.members });
        }
        if (method === "POST")
          return json(
            {
              member: await service.addProjectMember(
                actor,
                projectId,
                text(b.membershipId),
                text(b.role) as "MAINTAINER" | "CONTRIBUTOR",
              ),
            },
            201,
          );
        if (method === "DELETE")
          return json({
            removed: await service.removeProjectMember(
              actor,
              projectId,
              text(new URL(request.url).searchParams.get("membershipId")),
            ),
          });
      }
      if (parts[2] === "agents") {
        if (method === "POST")
          return json(
            {
              agent: await service.linkAgent(
                actor,
                projectId,
                text(b.agentId),
                typeof b.relationship === "string" ? b.relationship : null,
              ),
            },
            201,
          );
        if (method === "DELETE")
          return json({
            removed: await service.unlinkAgent(
              actor,
              projectId,
              text(new URL(request.url).searchParams.get("agentId")),
            ),
          });
      }
      if (parts[2] === "harnesses") {
        if (method === "GET")
          return json({
            harnesses: await service.readHarnesses(actor, projectId),
          });
        if (method === "POST")
          return json(
            {
              harness: await service.createHarness(
                actor,
                projectId,
                b as never,
              ),
            },
            201,
          );
        if ((method === "PUT" || method === "PATCH") && parts[3])
          return json({
            harness: await service.updateHarness(
              actor,
              projectId,
              parts[3],
              b as never,
            ),
          });
      }
      if (parts[2] === "artifacts") {
        if (method === "GET")
          return json({
            artifacts: await service.readArtifacts(actor, projectId),
          });
        if (method === "POST")
          return json(
            {
              artifact: await service.createArtifact(
                actor,
                projectId,
                b as never,
              ),
            },
            201,
          );
        if ((method === "PUT" || method === "PATCH") && parts[3])
          return json({
            artifact: await service.updateArtifact(actor, parts[3], b as never),
          });
      }
      if (parts[2] === "evidence") {
        if (method === "GET")
          return json({
            evidence: await service.readEvidence(actor, projectId),
          });
        if (method === "POST")
          return json(
            {
              evidence: await service.createEvidence(
                actor,
                projectId,
                b as never,
              ),
            },
            201,
          );
      }
      if (parts[2] === "contributions") {
        if (method === "GET")
          return json({
            contributions: await service.readContributions(actor, projectId),
          });
        if (method === "POST")
          return json(
            {
              contribution: await service.createContribution(
                actor,
                projectId,
                text(b.contributorMembershipId),
                b as never,
              ),
            },
            201,
          );
      }
      if (parts[2] === "work-graph" && method === "GET")
        return json({
          workGraph: await service.readWorkGraph(actor, projectId),
        });
    }
    return json({ error: "NOT_FOUND" }, 404);
  } catch (error) {
    if (error instanceof CoreApplicationError)
      return json(
        { error: error.code, correlationId: randomUUID() },
        status(error.code),
      );
    return json({ error: "INTERNAL_ERROR", correlationId: randomUUID() }, 500);
  }
}
