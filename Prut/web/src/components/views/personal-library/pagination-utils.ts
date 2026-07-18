/**
 * Build the page-number strip (with ellipses) for the personal-library
 * pagination control. Pure: derives entirely from the total page count and the
 * current page. Extracted verbatim from PersonalLibraryView so it can be tested
 * in isolation.
 *
 * - ≤7 pages → every page shown, no ellipsis.
 * - >7 pages → first page, a window of ±1 around the current page, the last
 *   page, and `"..."` gaps where pages are elided.
 */
export function getPaginationPages(totalPages: number, currentPage: number): (number | "...")[] {
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++)
      pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}
