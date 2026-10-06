import { notFound } from "next/navigation";

import { IdentityGateClient } from "./identity-gate-client";

export default function IdentityGatePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <IdentityGateClient />;
}
