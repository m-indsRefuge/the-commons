# ADR-0002 — PostgreSQL, Drizzle, and Migration Architecture

Status: Accepted

## Context

The Commons needs a relational datastore for identity, accountability, project membership, contribution provenance, moderation, and audit history. Schema changes must be reviewable, reproducible, and safe for an AI-assisted engineering workflow.

## Decision

- PostgreSQL is the system of record.
- Neon is the initial hosted PostgreSQL provider for development and the Founding Ten demo.
- Local development and CI use isolated PostgreSQL instances.
- Drizzle ORM is the application data-access layer.
- Drizzle Kit generates version-controlled SQL migrations.
- Production and preview environments never rely on schema push as the deployment contract.
- Migrations run as an explicit deployment step, not on application startup.
- Every migration chain must be reconstructible from an empty database in CI.
- Destructive production changes use expand → migrate/backfill → contract.
- Provider-specific features must not prevent migration to ordinary PostgreSQL, including AWS RDS.

## Consequences

Neon is infrastructure, not architecture. Application code depends on PostgreSQL semantics and Drizzle, not Neon-specific APIs.

Migration SQL is reviewable source code. Schema changes affecting ownership, visibility, attribution, deletion, or audit retention require explicit review before merge.
