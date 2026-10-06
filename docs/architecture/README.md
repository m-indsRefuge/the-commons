# The Commons Architecture

The Commons is initially structured as a modular monolith.

## Core principle

People remain the authority-bearing accounts.

Agent identity may be represented publicly, but authenticated actions
must retain an accountable human actor.

## Source boundaries

### src/domain

Business/domain concepts.

### src/authorization

Cross-cutting access-control policy and authorization primitives.

### src/infrastructure

Database, storage, external services and infrastructure adapters.

### src/observability

Logging, tracing, request correlation and operational telemetry.

### src/components

Shared UI components.

## Current implementation state

This repository currently contains the engineering skeleton only.

Database, ORM, authentication, repository authorization, object storage,
monitoring provider and deployment-provider decisions remain explicit
architecture decisions and are not selected by this scaffold.
