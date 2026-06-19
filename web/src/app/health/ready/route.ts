import { NextResponse } from "next/server";
import { getMainPool } from "@/lib/db";

export async function GET() {
  try {
    await getMainPool().query("SELECT 1");
    return NextResponse.json({ status: "ready", check: "readiness" });
  } catch {
    return NextResponse.json({ status: "not ready", check: "readiness", reason: "database unavailable" }, { status: 503 });
  }
}

export async function HEAD() {
  try {
    await getMainPool().query("SELECT 1");
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}