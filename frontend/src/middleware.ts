import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  // Get the response
  return next().then((response) => {
    // Clone the response so we can modify headers
    const newResponse = new Response(response.body, response);

    // Security Headers

    // 1. Cache-Control instead of Expires
    // Use Cache-Control for better control over caching
    newResponse.headers.set('Cache-Control', 'public, max-age=3600, must-revalidate');
    newResponse.headers.delete('Expires'); // Remove deprecated Expires header

    // 2. Content-Security-Policy instead of X-Frame-Options
    // Allow Google Fonts and necessary resources
    newResponse.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'self'; " +
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' ws: wss:;"
    );
    newResponse.headers.delete('X-Frame-Options'); // Remove deprecated header

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
});
