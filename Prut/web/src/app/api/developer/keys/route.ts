import { NextResponse } from "next/server";

// Developer API keys are currently disabled

export async function GET() {
  return NextResponse.json({ error: "Developer API is currently unavailable" }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({ error: "Developer API is currently unavailable" }, { status: 503 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Developer API is currently unavailable" }, { status: 503 });
}
