-- REFERENCE CONTRACT ONLY.
-- The executable migration will be generated/reviewed after Drizzle and Better Auth are installed.
-- Better Auth owns its generated user/session/account/verification schema.

CREATE TYPE commons_membership_status AS ENUM (
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED'
);

CREATE TYPE commons_role AS ENUM (
  'MEMBER',
  'MODERATOR',
  'ADMIN'
);

CREATE TABLE commons_membership (
  id uuid PRIMARY KEY,
  auth_user_id text NOT NULL UNIQUE,
  status commons_membership_status NOT NULL,
  role commons_role NOT NULL DEFAULT 'MEMBER',
  admitted_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE invite (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  email_normalized text,
  created_by_membership_id uuid REFERENCES commons_membership(id),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  consumed_at timestamptz,
  consumed_by_membership_id uuid REFERENCES commons_membership(id),
  created_at timestamptz NOT NULL
);

CREATE TABLE audit_event (
  id uuid PRIMARY KEY,
  actor_membership_id uuid REFERENCES commons_membership(id),
  event_type text NOT NULL,
  target_type text,
  target_id text,
  correlation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL
);

CREATE INDEX audit_event_actor_created_idx
  ON audit_event (actor_membership_id, created_at DESC);

CREATE INDEX audit_event_target_created_idx
  ON audit_event (target_type, target_id, created_at DESC);
