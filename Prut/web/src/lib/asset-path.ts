/**
 * Utility to get the correct asset path based on the basePath configuration.
 * This is needed for raw <img> tags and other assets that don't use Next.js Image component.
 */
export function getAssetPath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}
