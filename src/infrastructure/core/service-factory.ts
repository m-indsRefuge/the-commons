import {
  CoreWorkApplicationService,
  type CoreWorkStore,
  type CoreWorkUnitOfWork,
} from "@/domain/core/application-service";
import { DrizzleCoreDomainAuditPersistence } from "@/infrastructure/database/core/audit-persistence";
import { withCoreDomainTransaction } from "@/infrastructure/database/core/database-executor";
import {
  DrizzleAgentProfileRepository,
  DrizzleArtifactRepository,
  DrizzleContributionRepository,
  DrizzleDeveloperProfileRepository,
  DrizzleEvidenceRepository,
  DrizzleProjectAgentRepository,
  DrizzleProjectHarnessRepository,
  DrizzleProjectMemberRepository,
  DrizzleProjectRepository,
} from "@/infrastructure/database/core/drizzle-repositories";
import { getDatabase } from "@/infrastructure/database/client";
import type { CoreDomainExecutor } from "@/infrastructure/database/core/database-executor";
import { DrizzleProjectWorkGraphReadModel } from "@/infrastructure/database/core/work-graph-read-model";
function unit(
  executor: CoreDomainExecutor = getDatabase(),
): CoreWorkUnitOfWork {
  return {
    developers: new DrizzleDeveloperProfileRepository(executor),
    agents: new DrizzleAgentProfileRepository(executor),
    projects: new DrizzleProjectRepository(executor),
    members: new DrizzleProjectMemberRepository(executor),
    projectAgents: new DrizzleProjectAgentRepository(executor),
    harnesses: new DrizzleProjectHarnessRepository(executor),
    artifacts: new DrizzleArtifactRepository(executor),
    evidence: new DrizzleEvidenceRepository(executor),
    contributions: new DrizzleContributionRepository(executor),
    findWorkGraph: (projectId) =>
      new DrizzleProjectWorkGraphReadModel(executor).findByProjectId(projectId),
    audit: (event) =>
      new DrizzleCoreDomainAuditPersistence(executor).append(event),
  };
}
function store(): CoreWorkStore {
  const base = unit();
  return {
    ...base,
    transaction: (operation) =>
      withCoreDomainTransaction(getDatabase(), (executor) =>
        operation(unit(executor)),
      ),
  };
}
export function createCoreWorkService(): CoreWorkApplicationService {
  return new CoreWorkApplicationService(store());
}
