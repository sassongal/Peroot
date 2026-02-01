/**
 * Utility to get the correct API path based on the basePath configuration.
 * This ensures that client-side fetch calls respect the subdirectory deployment.
 */
export function getApiPath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // If the path already includes the base path (e.g. from a previous call), don't add it again
  if (basePath && normalizedPath.startsWith(basePath)) {
    return normalizedPath;
  }
  return `${basePath}${normalizedPath}`;
}
