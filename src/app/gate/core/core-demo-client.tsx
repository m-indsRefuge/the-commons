"use client";
import { useState } from "react";
type Result = { [key: string]: unknown };
export function CoreDemoClient() {
  const [output, setOutput] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  async function call(path: string, method: string, payload?: Result) {
    setBusy(true);
    try {
      const response = await fetch(`/api/core/${path}`, {
        method,
        headers: payload ? { "content-type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      setOutput((await response.json()) as Result);
    } catch {
      setOutput({ error: "NETWORK_ERROR" });
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mode = String(form.get("mode"));
    const data: Result = Object.fromEntries(form.entries());
    delete data.mode;
    if (mode === "profile") return call("developers/me", "POST", data);
    if (mode === "agent")
      return call("agents", "POST", {
        ...data,
        capabilities: String(data.capabilities ?? "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      });
    if (mode === "project") return call("projects", "POST", data);
    const projectId = String(data.projectId);
    delete data.projectId;
    if (mode === "harness" || mode === "artifact" || mode === "evidence")
      return call(
        `projects/${projectId}/${mode === "harness" ? "harnesses" : mode === "artifact" ? "artifacts" : "evidence"}`,
        "POST",
        data,
      );
    if (mode === "member")
      return call(`projects/${projectId}/members`, "POST", data);
    if (mode === "link")
      return call(`projects/${projectId}/agents`, "POST", data);
    if (mode === "contribution")
      return call(`projects/${projectId}/contributions`, "POST", data);
  }
  return (
    <main className="core-demo">
      <header>
        <p>THE COMMONS · CORE WORK SYSTEM</p>
        <h1>Work, with its provenance.</h1>
        <p>
          Development workspace for human profiles, accountable Agents,
          Projects, and recorded work.
        </p>
      </header>
      <section className="core-grid">
        <form onSubmit={submit}>
          <h2>Create a record</h2>
          <label>
            Record type
            <select name="mode">
              <option value="profile">Developer profile</option>
              <option value="agent">Agent</option>
              <option value="project">Project</option>
              <option value="member">Project member</option>
              <option value="link">Link Agent</option>
              <option value="harness">Harness</option>
              <option value="artifact">Artifact</option>
              <option value="evidence">Evidence</option>
              <option value="contribution">Contribution</option>
            </select>
          </label>
          <label>
            Project ID (for project work)
            <input name="projectId" />
          </label>
          <label>
            Handle / slug
            <input name="handle" placeholder="Used by profile" />
            <input name="slug" placeholder="Used by Agent or Project" />
          </label>
          <label>
            Name
            <input name="displayName" placeholder="Display name" />
            <input name="name" placeholder="Agent, Project or harness name" />
          </label>
          <label>
            Summary
            <input name="summary" />
            <textarea name="bio" placeholder="Profile bio or description" />
          </label>
          <label>
            Visibility
            <select name="visibility">
              <option>MEMBERS</option>
              <option>PRIVATE</option>
              <option>PUBLIC</option>
            </select>
          </label>
          <label>
            Relationship / role
            <input name="role" placeholder="CONTRIBUTOR / MAINTAINER" />
            <input name="relationship" placeholder="Agent relationship" />
          </label>
          <label>
            Membership / Agent IDs
            <input name="membershipId" placeholder="Member ID" />
            <input name="agentId" placeholder="Agent ID" />
          </label>
          <label>
            Contribution fields
            <input
              name="contributorMembershipId"
              placeholder="Human contributor membership ID"
            />
            <input name="kind" placeholder="Kind (e.g. CODE, DOCUMENT)" />
            <input name="title" placeholder="Title" />
            <input
              name="capabilities"
              placeholder="Agent capabilities, comma separated"
            />
          </label>
          <button disabled={busy}>{busy ? "Saving…" : "Save record"}</button>
        </form>
        <div className="core-read">
          <h2>Inspect records</h2>
          <p>
            Read uses the same authenticated API and visibility policy as the
            application.
          </p>
          <ReadForm onRead={call} />
          <h2>Latest response</h2>
          <pre>
            {output
              ? JSON.stringify(output, null, 2)
              : "Choose an action to begin."}
          </pre>
        </div>
      </section>
    </main>
  );
}
function ReadForm({
  onRead,
}: {
  onRead: (path: string, method: string) => Promise<void>;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const d = new FormData(event.currentTarget);
        const kind = String(d.get("kind"));
        const id = String(d.get("id"));
        void onRead(
          kind === "profile"
            ? `developers/handle/${id}`
            : kind === "agent"
              ? `agents/${id}`
              : `projects/${id}/${kind === "graph" ? "work-graph" : ""}`,
          "GET",
        );
      }}
    >
      <label>
        Record type
        <select name="kind">
          <option value="profile">Developer handle</option>
          <option value="agent">Agent ID</option>
          <option value="project">Project ID</option>
          <option value="graph">Project work graph</option>
        </select>
      </label>
      <label>
        Handle or ID
        <input name="id" required />
      </label>
      <button>Read</button>
    </form>
  );
}
