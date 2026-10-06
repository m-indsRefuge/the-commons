import type {
  ContentVisibility,
  RecordStatus,
} from "@/domain/core/types";

export interface AgentProfile {
  id: string;
  operatorMembershipId: string;
  slug: string;
  name: string;
  summary: string | null;
  modelProvider: string | null;
  modelName: string | null;
  runtime: string | null;
  harness: string | null;
  capabilities: readonly string[];
  status: RecordStatus;
  visibility: ContentVisibility;
  createdAt: Date;
  updatedAt: Date;
}
