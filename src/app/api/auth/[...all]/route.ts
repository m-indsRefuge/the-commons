import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/infrastructure/auth/auth";

function handler() {
  return toNextJsHandler(getAuth());
}

export async function GET(request: Request): Promise<Response> {
  return handler().GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return handler().POST(request);
}
