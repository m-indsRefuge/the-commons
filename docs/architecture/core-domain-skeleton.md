# Core Domain Skeleton

## Purpose

This layer defines what The Commons is before feature implementation scales out. It is deliberately implementation-light but contract-heavy.

## Domain boundaries

### DeveloperProfile

Represents the professional identity presented by an ACTIVE Commons member.

Invariant:

- one profile per membership;
- handle unique across The Commons;
- profile owner is the linked membership;
- profile data grants no additional authorization.

### AgentProfile

Represents an AI Agent operated by a human member.

Invariant:

- exactly one accountable operator membership;
- an Agent never holds Commons membership authority;
- Agent attribution does not replace the authenticated human actor;
- archive rather than delete once referenced by provenance.

### Project

Represents a substantial piece of work shown in The Commons.

Invariant:

- exactly one owner membership;
- ownership is canonical on the Project record;
- additional human participation is represented by ProjectMember;
- Agent participation is represented by ProjectAgent;
- visibility is explicit;
- archive rather than delete once work evidence exists.

### ProjectHarness

Optional technical context describing an Agent/runtime/harness configuration used on a Project.

It is descriptive evidence, not an authority-bearing identity.

### Artifact

A concrete project output or externally addressable work item such as a repository, demo, screenshot, document, release, benchmark, or other artifact.

Every artifact records the human membership that attached or created it.

### Evidence

A first-class claim-support record for a Project, optionally linked to an Artifact.

Examples include test results, demos, benchmark results, deployments, reviews, and releases. Evidence records who submitted it; Stage 1 does not infer independent verification.

### ContributionCredit

Records a contribution to a Project.

Every contribution has:

- a human contributor membership;
- a human recorder membership;
- optional Agent attribution;
- optional Artifact linkage;
- contribution kind and summary.

An Agent-only contribution record is invalid.

## Visibility

`PRIVATE`, `MEMBERS`, and `PUBLIC` are domain values. Product surfaces may expose a subset during the invite-only phase.

## Authorization seams

The core policy layer provides:

- Developer Profile owner checks;
- Agent operator checks;
- Project manager checks;
- visibility reads;
- self-or-project-manager contribution recording.

All checks begin with the Platform/Identity ACTIVE-membership boundary except PUBLIC reads.

## Database ownership

The Commons owns all tables in this subsystem. Better Auth remains isolated to its authentication tables.

The schema is defined in `src/infrastructure/database/schema/core-domain.ts`. Drizzle Kit generates migration SQL; migrations must not be handwritten or applied at application startup.

## Jules handoff rule

Jules may build behind these interfaces and add implementation detail, but must not:

- give an Agent independent human authority;
- introduce a second Project owner source of truth;
- allow provenance records with no human membership;
- merge GitHub authentication with repository authorization;
- bypass server-side authorization;
- redefine visibility or lifecycle semantics without an ADR.
