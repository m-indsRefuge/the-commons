export type ContentVisibility = "PRIVATE" | "MEMBERS" | "PUBLIC";

export type RecordStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface PageRequest {
  limit: number;
  cursor?: string;
}
