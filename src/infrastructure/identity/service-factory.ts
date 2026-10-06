import { IdentityService } from "@/domain/identity/service";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { DrizzleIdentityPersistence } from "@/infrastructure/database/identity-persistence";

export function createIdentityService(): IdentityService {
  const env = readServerEnvironment();

  return new IdentityService(
    new DrizzleIdentityPersistence(),
    env.INVITE_TOKEN_SECRET,
  );
}
