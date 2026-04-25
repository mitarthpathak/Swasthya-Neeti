/**
 * API utility — works for both local dev (proxy through Vite) and production (Vercel serverless).
 *
 * In local dev, the Vite dev server proxies /api/* to localhost:3001.
 * In production (Vercel), /api/* routes directly to serverless functions
 * so we use relative URLs (no base URL prefix needed).
 */

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function isLocalDev() {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

function getApiBaseUrl() {
  // If an explicit API base URL is configured, use it
  if (configuredApiBaseUrl) return configuredApiBaseUrl;
  // In production (Vercel), use relative paths — the API is on the same domain
  // In local dev, also use relative paths since Vite proxies /api/* to the server
  return '';
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiBaseUrl = getApiBaseUrl();
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

export async function apiRequest(path: string, init?: RequestInit) {
  const url = buildApiUrl(path);
  const response = await fetch(url, init);

  // In local dev, if the Vite proxy returns HTML instead of JSON (server not running),
  // try a direct request to localhost:3001 as fallback
  if (isLocalDev() && !configuredApiBaseUrl && path.startsWith('/api/')) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const { hostname, protocol } = window.location;
      const fallbackUrl = `${protocol}//${hostname}:3001${path}`;
      if (url !== fallbackUrl) {
        return fetch(fallbackUrl, init);
      }
    }
  }

  return response;
}

export async function parseApiJson<T>(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

  if (!raw) {
    throw new Error('The server returned an empty response.');
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(raw) as T;
  }

  const looksLikeHtml = /^\s*</.test(raw);
  if (looksLikeHtml) {
    throw new Error(
      'The chat history endpoint returned HTML instead of JSON. Please make sure the backend server is running on the API URL and has the latest chat routes.',
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('The server returned an unexpected response format.');
  }
}
