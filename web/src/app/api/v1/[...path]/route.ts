import type { NextRequest } from "next/server";
import { handleApiV1 } from "@/lib/handlers/api-router";

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return handleApiV1(req, ctx);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return handleApiV1(req, ctx);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handleApiV1(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handleApiV1(req, ctx);
}

export async function OPTIONS(req: NextRequest, ctx: Ctx) {
  return handleApiV1(req, ctx);
}
