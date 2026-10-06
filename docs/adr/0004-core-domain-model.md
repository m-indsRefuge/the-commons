# ADR-0004 — Core Domain Ownership and Provenance

Status: Accepted

## Context

The Commons needs stable domain contracts before high-throughput implementation begins. Developer profiles, Agent profiles, project showcases, artifacts, evidence, and contribution history all depend on a shared answer to three questions:

1. who holds authority;
2. what may be attributed to an Agent;
3. how work is connected to evidence.

If these rules are left to feature-level implementation, ownership and reputation semantics will drift across the product.

## Decision

Stage 1 uses the following core-domain model.

### Human authority

Commons memberships are the only authority-bearing identities.

- A Developer Profile belongs to exactly one membership.
- An Agent Profile has exactly one accountable operator membership.
- A Project has exactly one owner membership.
- Project membership grants bounded project roles.
- Artifacts, evidence, harness records, and contribution records are created or recorded by a membership.

Agents may be attributed to work but never replace the human actor responsible for the operation.

### Work graph

```text
Membership
  ├── DeveloperProfile
  ├── operates → AgentProfile
  └── owns / participates in → Project
                                 ├── ProjectMember
                                 ├── ProjectAgent
                                 ├── ProjectHarness
                                 ├── Artifact
                                 ├── Evidence
                                 └── ContributionCredit
```

### Provenance

A ContributionCredit always names a human contributor membership and may additionally attribute an Agent. Evidence is first-class and records who submitted it. An Artifact records who created or attached it.

These records are not reputation scores. Reputation and verification policy are later product layers.

### Lifecycle

Stage 1 prefers archive/status transitions over destructive deletion for Agents and Projects. Evidentiary records should remain referentially intact.

### Visibility

Core content uses a small shared visibility vocabulary:

- `PRIVATE`: owner/operator-authorized access only;
- `MEMBERS`: ACTIVE Commons members;
- `PUBLIC`: suitable for unauthenticated presentation when a public surface exists.

Stage 1 may choose not to expose PUBLIC surfaces yet; the domain value does not require them to exist immediately.

## Consequences

Jules may implement workflows, APIs, search, feeds, community features, and supporting UI against these contracts. Jules must not change human-authority semantics, ownership cardinality, Agent attribution rules, or provenance relationships without an ADR.

Aster may shape the Developer Profile, Agent Profile, and Project Showcase presentation without redefining their underlying authority/provenance model.
