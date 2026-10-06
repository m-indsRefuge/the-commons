import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "the-commons",
    },
    {
      status: 200,
    },
  );
}
