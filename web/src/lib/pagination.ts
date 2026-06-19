import type { Pool } from "pg";
import type { ApiMeta } from "./api-response";

export type PageParams = { page: number; perPage: number; offset: number };
export type CursorParams = { cursor?: string; perPage: number };

export interface CursorResult<T> {
  list: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function totalPages(total: number, perPage: number): number {
  if (perPage <= 0) return 0;
  return Math.ceil(total / perPage);
}

export function paginatedMeta(total: number, p: PageParams): ApiMeta {
  return {
    total,
    page: p.page,
    per_page: p.perPage,
    total_pages: totalPages(total, p.perPage),
  };
}

export function cursorMeta(nextCursor: string | null, hasMore: boolean, perPage: number): ApiMeta {
  return {
    next_cursor: nextCursor,
    has_more: hasMore,
    per_page: perPage,
  };
}

export function encodeCursor(values: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(values)).toString("base64url");
}

export function decodeCursor(cursor: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString());
  } catch {
    return {};
  }
}

export async function paginatedQuery<T>(
  pool: Pool,
  p: PageParams,
  countSQL: string,
  countArgs: unknown[],
  dataSQL: string,
  dataArgs: unknown[],
  scan: (row: Record<string, unknown>) => T
): Promise<{ list: T[]; total: number }> {
  const countRes = await pool.query(countSQL, countArgs);
  const total = Number(countRes.rows[0]?.count ?? countRes.rows[0]?.total ?? 0);
  const limitIdx = dataArgs.length + 1;
  const offsetIdx = dataArgs.length + 2;
  const q = `${dataSQL} LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  const rows = await pool.query(q, [...dataArgs, p.perPage, p.offset]);
  const list = rows.rows.map((r) => scan(r));
  return { list, total };
}

export async function keysetQuery<T>(
  pool: Pool,
  p: CursorParams,
  dataSQL: string,
  dataArgs: unknown[],
  scan: (row: Record<string, unknown>) => T,
  cursorColumns: string[] = ["created_at", "id"]
): Promise<CursorResult<T>> {
  const limit = p.perPage + 1;
  let whereCursor = "";
  const args = [...dataArgs];
  
  if (p.cursor) {
    const cursor = decodeCursor(p.cursor);
    const conditions: string[] = [];
    for (const col of cursorColumns) {
      if (cursor[col] !== undefined) {
        args.push(cursor[col]);
        conditions.push(`${col} < $${args.length}`);
      }
    }
    if (conditions.length > 0) {
      whereCursor = ` WHERE ${conditions.join(" AND ")}`;
    }
  }
  
  const limitIdx = args.length + 1;
  const q = `${dataSQL}${whereCursor} ORDER BY ${cursorColumns.map(c => `${c} DESC`).join(", ")} LIMIT $${limitIdx}`;
  const rows = await pool.query(q, [...args, limit]);
  const items = rows.rows.map((r) => scan(r));
  
  const hasMore = items.length > p.perPage;
  if (hasMore) items.pop();
  
  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1] as Record<string, unknown>;
    const cursorValues: Record<string, unknown> = {};
    for (const col of cursorColumns) {
      if (last[col] !== undefined) cursorValues[col] = last[col];
    }
    nextCursor = encodeCursor(cursorValues);
  }
  
  return { list: items, nextCursor, hasMore };
}

export function pageParams(req: Request): PageParams {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "20", 10)));
  return { page, perPage, offset: (page - 1) * perPage };
}

export function cursorParams(req: Request): CursorParams {
  const url = new URL(req.url);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "20", 10)));
  return { cursor: url.searchParams.get("cursor") ?? undefined, perPage };
}
