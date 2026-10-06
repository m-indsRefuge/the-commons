import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { memberships } from "./identity";

export const contentVisibility = pgEnum("content_visibility", [
  "PRIVATE",
  "MEMBERS",
  "PUBLIC",
]);

export const coreRecordStatus = pgEnum("core_record_status", [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
]);

export const projectMemberRole = pgEnum("project_member_role", [
  "MAINTAINER",
  "CONTRIBUTOR",
]);

export const artifactKind = pgEnum("artifact_kind", [
  "REPOSITORY",
  "DEMO",
  "SCREENSHOT",
  "DOCUMENT",
  "RELEASE",
  "BENCHMARK",
  "OTHER",
]);

export const evidenceKind = pgEnum("evidence_kind", [
  "TEST",
  "DEMO",
  "BENCHMARK",
  "DEPLOYMENT",
  "REVIEW",
  "RELEASE",
  "OTHER",
]);

export const contributionKind = pgEnum("contribution_kind", [
  "CODE",
  "DESIGN",
  "RESEARCH",
  "REVIEW",
  "TESTING",
  "DOCUMENTATION",
  "OPERATIONS",
  "OTHER",
]);

export const developerProfiles = pgTable(
  "developer_profile",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    handle: varchar("handle", { length: 40 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    headline: varchar("headline", { length: 160 }),
    bio: text("bio"),
    skills: text("skills").array().notNull(),
    focusAreas: text("focus_areas").array().notNull(),
    visibility: contentVisibility("visibility").default("MEMBERS").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("developer_profile_membership_uidx").on(table.membershipId),
    uniqueIndex("developer_profile_handle_uidx").on(table.handle),
  ],
);

export const agentProfiles = pgTable(
  "agent_profile",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    operatorMembershipId: uuid("operator_membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    summary: text("summary"),
    modelProvider: varchar("model_provider", { length: 120 }),
    modelName: varchar("model_name", { length: 160 }),
    runtime: varchar("runtime", { length: 160 }),
    harness: varchar("harness", { length: 160 }),
    capabilities: text("capabilities").array().notNull(),
    status: coreRecordStatus("status").default("DRAFT").notNull(),
    visibility: contentVisibility("visibility").default("MEMBERS").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("agent_profile_slug_uidx").on(table.slug),
    index("agent_profile_operator_idx").on(table.operatorMembershipId),
    index("agent_profile_status_idx").on(table.status),
  ],
);

export const projects = pgTable(
  "project",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerMembershipId: uuid("owner_membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    summary: varchar("summary", { length: 280 }).notNull(),
    description: text("description"),
    homepageUrl: text("homepage_url"),
    repositoryUrl: text("repository_url"),
    status: coreRecordStatus("status").default("DRAFT").notNull(),
    visibility: contentVisibility("visibility").default("MEMBERS").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("project_slug_uidx").on(table.slug),
    index("project_owner_idx").on(table.ownerMembershipId),
    index("project_status_visibility_idx").on(table.status, table.visibility),
  ],
);

export const projectMembers = pgTable(
  "project_member",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    role: projectMemberRole("role").notNull(),
    addedByMembershipId: uuid("added_by_membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.membershipId] }),
    index("project_member_membership_idx").on(table.membershipId),
  ],
);

export const projectAgents = pgTable(
  "project_agent",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agentProfiles.id, { onDelete: "restrict" }),
    relationship: varchar("relationship", { length: 120 }),
    linkedByMembershipId: uuid("linked_by_membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.agentId] }),
    index("project_agent_agent_idx").on(table.agentId),
  ],
);

export const projectHarnesses = pgTable(
  "project_harness",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    recordedByMembershipId: uuid("recorded_by_membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    runtime: varchar("runtime", { length: 160 }),
    version: varchar("version", { length: 80 }),
    description: text("description"),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("project_harness_project_idx").on(table.projectId)],
);

export const artifacts = pgTable(
  "artifact",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdByMembershipId: uuid("created_by_membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    kind: artifactKind("kind").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    summary: text("summary"),
    uri: text("uri"),
    contentHash: varchar("content_hash", { length: 128 }),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("artifact_project_created_idx").on(table.projectId, table.createdAt),
    index("artifact_kind_idx").on(table.kind),
  ],
);

export const projectEvidence = pgTable(
  "project_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    artifactId: uuid("artifact_id").references(() => artifacts.id, {
      onDelete: "set null",
    }),
    recordedByMembershipId: uuid("recorded_by_membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    kind: evidenceKind("kind").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    summary: text("summary"),
    uri: text("uri"),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("project_evidence_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("project_evidence_kind_idx").on(table.kind),
  ],
);

export const contributionCredits = pgTable(
  "contribution_credit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    contributorMembershipId: uuid("contributor_membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    recordedByMembershipId: uuid("recorded_by_membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    attributedAgentId: uuid("attributed_agent_id").references(
      () => agentProfiles.id,
      { onDelete: "restrict" },
    ),
    artifactId: uuid("artifact_id").references(() => artifacts.id, {
      onDelete: "set null",
    }),
    kind: contributionKind("kind").notNull(),
    summary: text("summary").notNull(),
    evidenceUri: text("evidence_uri"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("contribution_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("contribution_member_created_idx").on(
      table.contributorMembershipId,
      table.createdAt,
    ),
    index("contribution_agent_created_idx").on(
      table.attributedAgentId,
      table.createdAt,
    ),
  ],
);
