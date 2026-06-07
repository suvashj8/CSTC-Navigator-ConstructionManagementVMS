import type { Pool } from "pg";
import type { ApiMeta } from "./api-response";

export type PageParams = { page: number; perPage: number; offset: number };

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
