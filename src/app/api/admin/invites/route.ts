import { randomUUID } from "node:crypto";

import { IdentityError } from "@/domain/identity/errors";
import { resolveRequestActor } from "@/infrastructure/auth/session-actor";
import { createIdentityService } from "@/infrastructure/identity/service-factory";

const DEFAULT_INVITE_HOURS = 72;
const MAX_INVITE_HOURS = 24 * 14;

export async function POST(request: Request): Promise<Response> {
  const actor = await resolveRequestActor(request.headers);
  const body = (await request.json()) as {
    email?: unknown;
    expiresInHours?: unknown;
  };

  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email
      : undefined;
  const expiresInHours =
    typeof body.expiresInHours === "number"
      ? body.expiresInHours
      : DEFAULT_INVITE_HOURS;

  if (
    !Number.isFinite(expiresInHours) ||
    expiresInHours <= 0 ||
    expiresInHours > MAX_INVITE_HOURS
  ) {
    return Response.json({ error: "INVALID_EXPIRY" }, { status: 400 });
  }

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + expiresInHours * 60 * 60 * 1000,
  );

  try {
    const result = await createIdentityService().createInvite(actor, {
      email,
      expiresAt,
      now,
      correlationId: randomUUID(),
    });

    return Response.json(
      {
        invite: {
          id: result.invite.id,
          token: result.token,
          expiresAt: result.invite.expiresAt.toISOString(),
          email: result.invite.emailNormalized,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof IdentityError) {
      return Response.json(
        { error: error.code },
        { status: error.code === "FORBIDDEN" ? 403 : 400 },
      );
    }

    throw error;
  }
}
