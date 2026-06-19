export async function GET() {
  return Response.json({ status: "ok", check: "liveness" });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}