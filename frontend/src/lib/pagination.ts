/** Default list page size across the app. */
export const DEFAULT_PER_PAGE = 10;

export function totalPages(total: number, perPage = DEFAULT_PER_PAGE) {
  return Math.max(1, Math.ceil(total / perPage));
}
