/**
 * Auth layer - currently returns hardcoded user for single-user dev.
 * Replace with real auth (session, JWT, etc.) when needed.
 */

const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Get the authenticated user ID for frontend use.
 * Currently returns hardcoded dev user.
 */
export function getAuthenticatedUserId(): string {
  // TODO: Replace with real auth (e.g., from context, cookie, etc.)
  return DEV_USER_ID;
}

/**
 * Get user ID from request headers or fall back to dev user.
 * For use in API route handlers.
 */
export function getUserIdFromRequest(headers: Headers | Record<string, string | string[] | undefined>): string {
  const headerUserId = headers instanceof Headers 
    ? headers.get('x-user-id')
    : headers['x-user-id'];
  
  if (headerUserId) {
    return Array.isArray(headerUserId) ? headerUserId[0] : headerUserId;
  }
  return DEV_USER_ID;
}
