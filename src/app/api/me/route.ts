import {
  getAuthenticatedSessionUser,
  resolveRequestActor,
} from "@/infrastructure/auth/session-actor";

export async function GET(request: Request): Promise<Response> {
  const sessionUser = await getAuthenticatedSessionUser(request.headers);
  if (!sessionUser) {
    return Response.json({ authenticated: false, membership: null });
  }

  const actor = await resolveRequestActor(request.headers);

  return Response.json({
    authenticated: true,
    membership: actor.membershipId
      ? {
          id: actor.membershipId,
          status: actor.membershipStatus,
          role: actor.role,
        }
      : null,
  });
}
