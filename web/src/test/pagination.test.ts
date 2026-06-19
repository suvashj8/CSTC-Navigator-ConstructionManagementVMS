import { describe, it, expect, vi } from "vitest";
import { paginatedQuery, paginatedMeta, totalPages } from "@/lib/pagination";

describe("pagination utilities", () => {
  describe("totalPages", () => {
    it("returns 0 for zero total", () => {
      expect(totalPages(0, 10)).toBe(0);
    });

    it("returns 1 for exact fit", () => {
      expect(totalPages(10, 10)).toBe(1);
    });

    it("returns 2 for overflow", () => {
      expect(totalPages(11, 10)).toBe(2);
    });

    it("handles perPage of 0", () => {
      expect(totalPages(100, 0)).toBe(0);
    });
  });

  describe("paginatedMeta", () => {
    it("calculates metadata correctly", () => {
      const meta = paginatedMeta(25, { page: 2, perPage: 10, offset: 10 });
      expect(meta).toEqual({
        total: 25,
        page: 2,
        per_page: 10,
        total_pages: 3,
      });
    });
  });

  describe("paginatedQuery", () => {
    it("executes count and data queries with limit/offset", async () => {
      const mockPool = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ count: "42" }] })
          .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }),
      };

      const result = await paginatedQuery(
        mockPool as any,
        { page: 1, perPage: 2, offset: 0 },
        "SELECT COUNT(*) FROM test",
        [],
        "SELECT * FROM test",
        [],
        (row) => ({ id: row.id })
      );

      expect(result.total).toBe(42);
      expect(result.list).toEqual([{ id: 1 }, { id: 2 }]);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query.mock.calls[1][0]).toContain("LIMIT $1 OFFSET $2");
    });
  });
});