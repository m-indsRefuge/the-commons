import type { AuditEventInput } from "@/domain/identity/types";

import { getDatabase } from "../client";
import type { CoreDomainExecutor } from "./database-executor";
import { auditEvents } from "../schema";

export interface CoreDomainAuditEvent extends AuditEventInput {
  createdAt?: Date;
}

export class DrizzleCoreDomainAuditPersistence {
  constructor(private readonly database: CoreDomainExecutor = getDatabase()) {}

  async append(event: CoreDomainAuditEvent): Promise<void> {
    await this.database.insert(auditEvents).values({
      actorMembershipId: event.actorMembershipId,
      eventType: event.eventType,
      targetType: event.targetType,
      targetId: event.targetId,
      correlationId: event.correlationId,
      metadata: event.metadata ?? {},
      createdAt: event.createdAt ?? new Date(),
    });
  }
}
