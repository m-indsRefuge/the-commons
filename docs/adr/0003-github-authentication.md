# ADR-0003 — GitHub Authentication and Commons Authorization

Status: Accepted

## Context

Stage 1 is invite-only and aimed at AI developers/builders. GitHub is the simplest identity provider for the Founding Ten while also aligning with the future repository-evidence workflow.

Authentication and repository authorization have materially different risk profiles and must remain separate.

## Decision

- GitHub is the only authentication provider for the initial V1.
- Authentication requests identity/email scope only.
- GitHub login never grants repository access.
- Private/public repository access is implemented later through a separate GitHub App with explicitly selected repositories and minimum read-only permissions.
- Better Auth is the planned session/OAuth implementation layer unless a bounded implementation spike reveals a blocker.
- The Commons owns application authorization, membership state, suspension state, operator relationships, and object-level permissions.
- Auth-provider identifiers are external identifiers, not domain primary keys.
- Invite redemption and authenticated membership activation are transactional application operations.
- Authentication secrets and tokens must never appear in logs or audit metadata.

## Consequences

A successful GitHub login proves identity; it does not prove Commons membership or permission to perform a domain action.

The authorization layer must remain usable even if the authentication implementation changes later.
