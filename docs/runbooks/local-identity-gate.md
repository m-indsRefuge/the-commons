# Local Identity Gate

This runbook exercises the Stage 1 identity subsystem locally before any Founding Ten deployment.

## 1. Start PostgreSQL

```powershell
docker compose up -d postgres
```

Use the local connection string from `.env.example`:

```text
postgresql://commons:commons@localhost:5432/the_commons
```

Apply committed migrations explicitly:

```powershell
$env:DATABASE_URL="postgresql://commons:commons@localhost:5432/the_commons"
npm run db:migrate
```

Application startup must not apply migrations.

## 2. Register the GitHub OAuth app

Create a GitHub OAuth app for local development.

Use:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
- Wildcard callback matching: disabled

The Commons requests only `read:user` and `user:email` for authentication. Repository access is deliberately absent and will be implemented through a separate GitHub App.

## 3. Create local secrets

Create `.env.local` from `.env.example`.

Set:

- `DATABASE_URL`
- `BETTER_AUTH_URL=http://localhost:3000`
- a high-entropy `BETTER_AUTH_SECRET`
- GitHub OAuth `GITHUB_CLIENT_ID`
- GitHub OAuth `GITHUB_CLIENT_SECRET`
- a separate high-entropy `INVITE_TOKEN_SECRET`

Never commit `.env.local`.

## 4. Establish the first administrator

Start the app and authenticate once through GitHub. Authentication may create a Better Auth user without granting Commons membership; that separation is intentional.

Read the authenticated Better Auth user ID from the local `user` table, then run the one-time bootstrap:

```powershell
$env:DATABASE_URL="postgresql://commons:commons@localhost:5432/the_commons"
$env:BOOTSTRAP_AUTH_USER_ID="<better-auth-user-id>"
npm run identity:bootstrap-admin
```

The bootstrap fails closed if any Commons membership already exists. It creates one ACTIVE ADMIN membership and an audit event.

## 5. Gate 2 acceptance flow

Exercise the following sequence in the browser and API:

1. administrator session resolves to ACTIVE ADMIN;
2. administrator creates an invite;
3. invited GitHub user authenticates;
4. invite redemption creates ACTIVE MEMBER;
5. the invite cannot be reused;
6. an email-bound invite rejects a different GitHub email;
7. a user with authentication but no membership has no member authority;
8. suspension causes member authorization to fail;
9. cross-account ownership policy denies access;
10. audit records exist for invite creation and membership activation.

Do not move to the Core Domain handoff until this flow is green.
