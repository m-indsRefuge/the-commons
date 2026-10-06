# Platform + Persistence + Identity Subsystem

## Purpose

This subsystem establishes the trust boundary underneath every later Commons feature. Profiles, Agents, Projects, Showcase, community features, and moderation may depend on it; they must not redefine it.

## Responsibilities

### Platform

- server environment validation;
- health/operational boundaries;
- database connection abstraction;
- migration workflow;
- audit-safe correlation metadata.

### Identity

- authenticated human identity;
- Commons membership state;
- invite lifecycle;
- session boundary;
- suspension/deactivation handling;
- audit attribution.

### Authorization

- authenticated actor representation;
- role/capability checks;
- object-level ownership checks;
- denial-by-default helpers.

## Non-responsibilities

This subsystem does not own:

- Developer Profile presentation;
- Agent Profile presentation;
- Project Showcase design;
- GitHub repository installation/selection;
- feed or social graph behavior.

## Invariants

1. Every mutating domain operation has an authenticated human actor.
2. Displaying an Agent as an attributed identity never replaces the authenticated human actor.
3. GitHub authentication grants no repository permission.
4. An authenticated user without an ACTIVE Commons membership cannot use member write paths.
5. Suspended users cannot use member write paths.
6. Invite tokens are never persisted in plaintext.
7. Invalid, expired, revoked, or previously consumed invitations cannot activate membership.
8. Audit records retain actor identity and event type without storing secrets/tokens.
9. Authorization is enforced server-side and defaults to deny.
10. Database migrations are explicit artifacts and never run implicitly during application startup.

## Planned runtime integration

The runtime wiring pass will add Drizzle, PostgreSQL, and Better Auth after the package lock is regenerated locally. Better Auth's generated Drizzle schema remains the authority for its own user/session/account/verification tables; Commons-specific membership, invite, audit, and profile-shell tables remain application-owned.

## Handoff boundary for Jules

Jules may implement functions behind these contracts and extend tests, but must not change the authentication/repository-access separation, membership states, audit provenance, or deny-by-default authorization semantics without an ADR.
