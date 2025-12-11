import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  const newResponse = new Response(response.body, response);

  const connectSources = ["'self'", 'ws:', 'wss:'];
  const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL || '/api';
  try {
    const apiUrl = new URL(apiBaseUrl);
    connectSources.push(apiUrl.origin);
  } catch {
    // Relative /api stays under 'self'
  }

  newResponse.headers.set('Cache-Control', 'public, max-age=3600, must-revalidate');
  newResponse.headers.delete('Expires');

  // Set Content-Type with UTF-8 charset for HTML responses
  const contentType = newResponse.headers.get('Content-Type');
  if (contentType && contentType.includes('text/html')) {
    newResponse.headers.set('Content-Type', 'text/html; charset=utf-8');
  }
  // Ensure SVGs specify UTF-8 charset for linters/tooling
  if (contentType && contentType.startsWith('image/svg+xml') && !contentType.toLowerCase().includes('charset=')) {
    newResponse.headers.set('Content-Type', 'image/svg+xml; charset=utf-8');
  }

  newResponse.headers.set(
    'Content-Security-Policy',
    [
      "frame-ancestors 'self'",
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: https:",
      `connect-src ${connectSources.join(' ')}`,
    ].join('; ') + ';'
  );
  newResponse.headers.delete('X-Frame-Options');

    // 3. Remove unneeded x-xss-protection header
    // X-XSS-Protection is deprecated and can create security issues
    newResponse.headers.delete('x-xss-protection');
    newResponse.headers.delete('X-XSS-Protection');

    // Additional modern security headers
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newResponse.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    return newResponse;
});
