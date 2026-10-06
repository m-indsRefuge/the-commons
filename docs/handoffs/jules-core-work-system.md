# Jules Handoff — Core Work System

## Role

You are the implementation engineer for The Commons Stage 1 Core Work System.

Byte has already established the architecture, authority model, database schema skeleton, authorization seams, and provenance contracts. Your job is to build substantial working systems inside those rails, not redesign them.

## Repository and branch

Repository: `m-indsRefuge/the-commons`

Start from the accepted Core Domain foundation after its generated migration has been committed.

Read first:

- `AGENTS.md`
- `docs/adr/0001-modular-monolith.md`
- `docs/adr/0002-postgresql-drizzle-migrations.md`
- `docs/adr/0003-github-authentication.md`
- `docs/adr/0004-core-domain-model.md`
- `docs/architecture/platform-identity-subsystem.md`
- `docs/architecture/platform-identity-runtime.md`
- `docs/architecture/core-domain-skeleton.md`

## Goal

Implement a complete, professional, testable Core Work System behind the existing contracts for:

- Developer Profiles;
- Agent Profiles;
- Projects;
- Project members;
- Project ↔ Agent relationships;
- Project Harness records;
- Artifacts;
- Evidence;
- Contribution Credits.

The result should be usable by later Aster-owned Developer Profile, Agent Profile, and Project Showcase experiences without those UI surfaces needing to invent backend behavior.

## Locked architecture — do not redefine

1. Commons memberships are the only authority-bearing identities.
2. An Agent never holds independent Commons authority.
3. Every Agent has one accountable operator membership.
4. Every Project has one canonical owner membership.
5. ContributionCredit always has a human contributor and human recorder; Agent attribution is optional.
6. Artifacts, Evidence, Harness records, and relationship mutations are attributable to a human membership.
7. GitHub login grants no repository access. Repository integration remains a separate GitHub App boundary.
8. Authorization is enforced server-side and defaults to deny.
9. Suspended/inactive memberships cannot use member write paths.
10. Prefer lifecycle/archive transitions over destructive deletion where provenance would otherwise be lost.
11. PostgreSQL is the system of record; Drizzle migrations are explicit deployment artifacts and never run at application startup.
12. Do not change domain cardinality, visibility semantics, or authority/provenance rules without an ADR and Byte review.

## Implementation package

### 1. Persistence

Implement Drizzle-backed repositories behind the interfaces in `src/domain/core/repositories.ts`.

Persistence must cover:

- DeveloperProfile;
- AgentProfile;
- Project;
- ProjectMember;
- ProjectAgent;
- ProjectHarness;
- Artifact;
- ProjectEvidence;
- ContributionCredit.

Use transactions for multi-record operations that would otherwise permit partial state.

### 2. Application services

Create application/service-layer use cases that combine:

- RequestActor resolution;
- core-domain authorization policy;
- validation/invariants;
- repositories;
- audit-event persistence.

At minimum provide coherent create/read/update/archive flows for DeveloperProfile, AgentProfile, and Project, plus project relationship and provenance operations.

Do not put authorization only in React or route handlers.

### 3. Project authority

Implement Project ownership/participation semantics:

- owner;
- maintainers;
- contributors;
- linked Agents.

Owner remains canonical on `project.owner_membership_id`; do not create a second OWNER role in `project_member`.

### 4. Provenance

Implement creation/read paths for:

- ProjectHarness;
- Artifact;
- ProjectEvidence;
- ContributionCredit.

Contribution writes must preserve human authority even when an Agent is attributed.

Do not implement reputation scoring or claim that Evidence is independently verified.

### 5. API surface

Add typed server endpoints appropriate to the existing Next.js App Router architecture.

Keep transport DTOs separate from database records where useful.

Return stable machine-readable error codes for authorization, validation, conflict, and missing-resource cases.

### 6. Functional product shell

Build only enough UI to prove the system and support live demo/testing:

- create/edit Developer Profile;
- create/edit/archive Agent;
- create/edit/archive Project;
- manage Project human/Agent relationships;
- attach Artifact;
- record Evidence;
- record ContributionCredit;
- read a Project's assembled work graph.

This is functional UI, not final product design.

Do not spend implementation time polishing the three differentiating surfaces. Aster owns the final Developer Profile, Agent Profile, and Project Showcase experience.

### 7. Search/read models

Implement efficient PostgreSQL-backed read paths needed by the functional shell:

- Developer by handle;
- Agent by slug;
- Project by slug;
- Projects by owner/participant;
- contributions by human;
- contributions by Agent;
- Project artifacts/evidence/harness/participants.

Avoid introducing Elasticsearch or another search service in Stage 1.

### 8. Auditing

Meaningful mutations must append audit events without secrets or raw credentials.

Use existing Platform/Identity audit semantics and correlation metadata.

### 9. Tests

Add:

- domain/service tests;
- authorization tests;
- real PostgreSQL integration tests;
- transaction/rollback tests for multi-record writes;
- cross-account denial cases;
- suspended-member denial cases;
- Agent-attribution-with-human-authority cases;
- project owner/maintainer/contributor boundary cases.

Keep the migration-from-zero CI path green.

## Deliberately out of scope for this package

Do not build:

- final visual design;
- reputation scoring;
- ranking/recommendation algorithms;
- messaging;
- notifications;
- complex moderation workflow;
- GitHub App repository ingestion;
- feed/follow/comments/reactions;
- public launch mechanics.

Those are later bounded packages.

## Definition of done

This package is complete when:

1. every existing Core Domain repository contract has a production Drizzle implementation;
2. service-layer mutations are server-authorized and audited;
3. a functional user can create a Developer Profile, Agent, and Project;
4. a Project can link people and Agents and contain Harness, Artifact, Evidence, and Contribution records;
5. read models can assemble the complete Project work graph;
6. denial paths are covered by automated tests;
7. clean PostgreSQL migrations and integration tests pass;
8. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, and `npm run build` are green;
9. no locked ADR/core-domain invariant has been changed;
10. the final PR includes a concise implementation summary, schema changes, test evidence, and any follow-up risks.

## Process

Before editing:

1. inspect the existing architecture and tests;
2. produce a short implementation map grouped by persistence, services, API, functional UI, and tests;
3. identify any conflict with a locked invariant before writing code.

Then implement in coherent subsystem-sized commits.

If an architectural contract genuinely blocks implementation, stop at that boundary and report the exact conflict rather than silently redesigning it.
