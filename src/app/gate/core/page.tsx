import { notFound } from "next/navigation";
import { CoreDemoClient } from "./core-demo-client";
export default function CoreDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CoreDemoClient />;
}
