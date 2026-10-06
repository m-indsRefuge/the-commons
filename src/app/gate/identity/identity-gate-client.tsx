"use client";

import { useState } from "react";

import { authClient } from "@/infrastructure/auth/auth-client";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

async function readJson(response: Response): Promise<JsonValue> {
  return (await response.json()) as JsonValue;
}

export function IdentityGateClient() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [me, setMe] = useState<JsonValue>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<JsonValue>(null);
  const [redeemToken, setRedeemToken] = useState("");
  const [redeemResult, setRedeemResult] = useState<JsonValue>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/gate/identity",
    });
  }

  async function signOut() {
    setError(null);
    await authClient.signOut();
    await refetch();
    setMe(null);
  }

  async function refreshMe() {
    setError(null);
    const response = await fetch("/api/me");
    setMe(await readJson(response));
  }

  async function createInvite() {
    setError(null);
    const response = await fetch("/api/admin/invites", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: inviteEmail.trim() || undefined,
      }),
    });

    const result = await readJson(response);
    setInviteResult(result);

    if (!response.ok) {
      setError(`Invite creation failed with HTTP ${response.status}.`);
    }
  }

  async function redeemInvite() {
    setError(null);
    const response = await fetch("/api/onboarding/redeem", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        token: redeemToken.trim(),
      }),
    });

    const result = await readJson(response);
    setRedeemResult(result);

    if (!response.ok) {
      setError(`Invite redemption failed with HTTP ${response.status}.`);
    }

    await refreshMe();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          Development only
        </p>
        <h1 className="text-3xl font-semibold">Identity Gate 2</h1>
        <p className="text-zinc-600">
          Temporary acceptance surface for GitHub authentication, Commons
          membership, invite creation, and invite redemption.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-xl font-medium">Authentication</h2>

        {isPending ? (
          <p>Loading session…</p>
        ) : session ? (
          <>
            <p>
              Signed in as <strong>{session.user.email}</strong>
            </p>
            <div className="flex gap-3">
              <button
                className="rounded border px-3 py-2"
                onClick={signOut}
                type="button"
              >
                Sign out
              </button>
              <button
                className="rounded border px-3 py-2"
                onClick={refreshMe}
                type="button"
              >
                Refresh /api/me
              </button>
            </div>
          </>
        ) : (
          <button
            className="rounded border px-3 py-2"
            onClick={signIn}
            type="button"
          >
            Sign in with GitHub
          </button>
        )}

        {me !== null ? (
          <pre className="overflow-auto rounded bg-zinc-100 p-3 text-sm">
            {JSON.stringify(me, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-xl font-medium">ADMIN invite creation</h2>
        <input
          className="w-full rounded border px-3 py-2"
          onChange={(event) => setInviteEmail(event.target.value)}
          placeholder="Optional email binding"
          type="email"
          value={inviteEmail}
        />
        <button
          className="rounded border px-3 py-2"
          onClick={createInvite}
          type="button"
        >
          Create invite
        </button>

        {inviteResult !== null ? (
          <pre className="overflow-auto rounded bg-zinc-100 p-3 text-sm">
            {JSON.stringify(inviteResult, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-xl font-medium">Invite redemption</h2>
        <textarea
          className="min-h-24 w-full rounded border px-3 py-2"
          onChange={(event) => setRedeemToken(event.target.value)}
          placeholder="Paste one-time invite token"
          value={redeemToken}
        />
        <button
          className="rounded border px-3 py-2"
          onClick={redeemInvite}
          type="button"
        >
          Redeem invite
        </button>

        {redeemResult !== null ? (
          <pre className="overflow-auto rounded bg-zinc-100 p-3 text-sm">
            {JSON.stringify(redeemResult, null, 2)}
          </pre>
        ) : null}
      </section>

      {error ? (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {error}
        </p>
      ) : null}
    </main>
  );
}
