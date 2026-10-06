CREATE TYPE "public"."artifact_kind" AS ENUM('REPOSITORY', 'DEMO', 'SCREENSHOT', 'DOCUMENT', 'RELEASE', 'BENCHMARK', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."content_visibility" AS ENUM('PRIVATE', 'MEMBERS', 'PUBLIC');--> statement-breakpoint
CREATE TYPE "public"."contribution_kind" AS ENUM('CODE', 'DESIGN', 'RESEARCH', 'REVIEW', 'TESTING', 'DOCUMENTATION', 'OPERATIONS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."core_record_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."evidence_kind" AS ENUM('TEST', 'DEMO', 'BENCHMARK', 'DEPLOYMENT', 'REVIEW', 'RELEASE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."project_member_role" AS ENUM('MAINTAINER', 'CONTRIBUTOR');--> statement-breakpoint
CREATE TABLE "agent_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_membership_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"summary" text,
	"model_provider" varchar(120),
	"model_name" varchar(160),
	"runtime" varchar(160),
	"harness" varchar(160),
	"capabilities" text[] NOT NULL,
	"status" "core_record_status" DEFAULT 'DRAFT' NOT NULL,
	"visibility" "content_visibility" DEFAULT 'MEMBERS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"created_by_membership_id" uuid NOT NULL,
	"kind" "artifact_kind" NOT NULL,
	"title" varchar(180) NOT NULL,
	"summary" text,
	"uri" text,
	"content_hash" varchar(128),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contribution_credit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"contributor_membership_id" uuid NOT NULL,
	"recorded_by_membership_id" uuid NOT NULL,
	"attributed_agent_id" uuid,
	"artifact_id" uuid,
	"kind" "contribution_kind" NOT NULL,
	"summary" text NOT NULL,
	"evidence_uri" text,
	"occurred_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "developer_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"handle" varchar(40) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"headline" varchar(160),
	"bio" text,
	"skills" text[] NOT NULL,
	"focus_areas" text[] NOT NULL,
	"visibility" "content_visibility" DEFAULT 'MEMBERS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_agent" (
	"project_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"relationship" varchar(120),
	"linked_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_agent_project_id_agent_id_pk" PRIMARY KEY("project_id","agent_id")
);
--> statement-breakpoint
CREATE TABLE "project_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"artifact_id" uuid,
	"recorded_by_membership_id" uuid NOT NULL,
	"kind" "evidence_kind" NOT NULL,
	"title" varchar(180) NOT NULL,
	"summary" text,
	"uri" text,
	"observed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_harness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"recorded_by_membership_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"runtime" varchar(160),
	"version" varchar(80),
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_member" (
	"project_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"role" "project_member_role" NOT NULL,
	"added_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_member_project_id_membership_id_pk" PRIMARY KEY("project_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_membership_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(140) NOT NULL,
	"summary" varchar(280) NOT NULL,
	"description" text,
	"homepage_url" text,
	"repository_url" text,
	"status" "core_record_status" DEFAULT 'DRAFT' NOT NULL,
	"visibility" "content_visibility" DEFAULT 'MEMBERS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_operator_membership_id_commons_membership_id_fk" FOREIGN KEY ("operator_membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_created_by_membership_id_commons_membership_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_credit" ADD CONSTRAINT "contribution_credit_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_credit" ADD CONSTRAINT "contribution_credit_contributor_membership_id_commons_membership_id_fk" FOREIGN KEY ("contributor_membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_credit" ADD CONSTRAINT "contribution_credit_recorded_by_membership_id_commons_membership_id_fk" FOREIGN KEY ("recorded_by_membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_credit" ADD CONSTRAINT "contribution_credit_attributed_agent_id_agent_profile_id_fk" FOREIGN KEY ("attributed_agent_id") REFERENCES "public"."agent_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_credit" ADD CONSTRAINT "contribution_credit_artifact_id_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_profile" ADD CONSTRAINT "developer_profile_membership_id_commons_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_agent" ADD CONSTRAINT "project_agent_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_agent" ADD CONSTRAINT "project_agent_agent_id_agent_profile_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_agent" ADD CONSTRAINT "project_agent_linked_by_membership_id_commons_membership_id_fk" FOREIGN KEY ("linked_by_membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_artifact_id_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_recorded_by_membership_id_commons_membership_id_fk" FOREIGN KEY ("recorded_by_membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_harness" ADD CONSTRAINT "project_harness_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_harness" ADD CONSTRAINT "project_harness_recorded_by_membership_id_commons_membership_id_fk" FOREIGN KEY ("recorded_by_membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_membership_id_commons_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_added_by_membership_id_commons_membership_id_fk" FOREIGN KEY ("added_by_membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_owner_membership_id_commons_membership_id_fk" FOREIGN KEY ("owner_membership_id") REFERENCES "public"."commons_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_profile_slug_uidx" ON "agent_profile" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "agent_profile_operator_idx" ON "agent_profile" USING btree ("operator_membership_id");--> statement-breakpoint
CREATE INDEX "agent_profile_status_idx" ON "agent_profile" USING btree ("status");--> statement-breakpoint
CREATE INDEX "artifact_project_created_idx" ON "artifact" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "artifact_kind_idx" ON "artifact" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "contribution_project_created_idx" ON "contribution_credit" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "contribution_member_created_idx" ON "contribution_credit" USING btree ("contributor_membership_id","created_at");--> statement-breakpoint
CREATE INDEX "contribution_agent_created_idx" ON "contribution_credit" USING btree ("attributed_agent_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "developer_profile_membership_uidx" ON "developer_profile" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "developer_profile_handle_uidx" ON "developer_profile" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "project_agent_agent_idx" ON "project_agent" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "project_evidence_project_created_idx" ON "project_evidence" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "project_evidence_kind_idx" ON "project_evidence" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "project_harness_project_idx" ON "project_harness" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_member_membership_idx" ON "project_member" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_slug_uidx" ON "project" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_owner_idx" ON "project" USING btree ("owner_membership_id");--> statement-breakpoint
CREATE INDEX "project_status_visibility_idx" ON "project" USING btree ("status","visibility");