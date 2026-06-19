import { NextResponse } from "next/server";

export type ApiMeta = {
  total?: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
  next_cursor?: string | null;
  has_more?: boolean;
};

export function ok<T>(data: T, meta?: ApiMeta) {
  return NextResponse.json({ success: true, data, meta });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function badRequest(message: string) {
  return NextResponse.json(
    { success: false, error: { code: "VALIDATION_ERROR", message } },
    { status: 400 }
  );
}

export function unauthorized(message = "unauthorized") {
  return NextResponse.json(
    { success: false, error: { code: "UNAUTHORIZED", message } },
    { status: 401 }
  );
}

export function tooManyRequests(message = "too many requests") {
  return NextResponse.json(
    { success: false, error: { code: "RATE_LIMITED", message } },
    { status: 429 }
  );
}

export function forbidden() {
  return NextResponse.json(
    { success: false, error: { code: "INSUFFICIENT_PERMISSIONS", message: "insufficient permissions" } },
    { status: 403 }
  );
}

export function internal(message: string) {
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message } },
    { status: 500 }
  );
}

export function notFound(message: string) {
  return NextResponse.json(
    { success: false, error: { code: "NOT_FOUND", message } },
    { status: 404 }
  );
}

export function serviceUnavailable(message: string | Record<string, unknown>) {
  if (typeof message === "string") {
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE", message } },
      { status: 503 }
    );
  }
  const hint =
    typeof message.hint === "string"
      ? message.hint
      : typeof message.status === "string"
        ? `service ${message.status}`
        : "service unavailable";
  return NextResponse.json(
    { success: false, error: { code: "SERVICE_UNAVAILABLE", message: hint }, data: message },
    { status: 503 }
  );
}
