import type { ContentVisibility } from "@/domain/core/types";

export interface DeveloperProfile {
  id: string;
  membershipId: string;
  handle: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  skills: readonly string[];
  focusAreas: readonly string[];
  visibility: ContentVisibility;
  createdAt: Date;
  updatedAt: Date;
}
