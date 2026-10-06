import { randomUUID } from "node:crypto";

import { IdentityError } from "@/domain/identity/errors";
import { getAuthenticatedSessionUser } from "@/infrastructure/auth/session-actor";
import { createIdentityService } from "@/infrastructure/identity/service-factory";

function errorStatus(error: IdentityError): number {
  if (error.code === "INVITE_NOT_FOUND") return 404;
  if (error.code === "INVITE_EMAIL_MISMATCH") return 403;
  if (error.code === "MEMBERSHIP_EXISTS") return 409;
  return 410;
}

export async function POST(request: Request): Promise<Response> {
  const sessionUser = await getAuthenticatedSessionUser(request.headers);
  if (!sessionUser) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = (await request.json()) as { token?: unknown };
  if (typeof body.token !== "string" || body.token.length < 20) {
    return Response.json({ error: "INVALID_TOKEN" }, { status: 400 });
  }

  try {
    const membership = await createIdentityService().redeemInvite({
      token: body.token,
      authUserId: sessionUser.authUserId,
      authenticatedEmail: sessionUser.email,
      correlationId: randomUUID(),
    });

    return Response.json(
      {
        membership: {
          id: membership.id,
          status: membership.status,
          role: membership.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof IdentityError) {
      return Response.json(
        { error: error.code },
        { status: errorStatus(error) },
      );
    }

    throw error;
  }
}
