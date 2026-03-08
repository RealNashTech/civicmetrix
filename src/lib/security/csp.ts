function buildDirectives(nonce: string): Record<string, string[]> {
  return {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "script-src": ["'self'", `'nonce-${nonce}'`],
    "style-src": ["'self'", "'unsafe-inline'"],
    "connect-src": ["'self'", "https://api.mapbox.com", "https://events.mapbox.com"],
    "img-src": ["'self'", "data:", "blob:", "https://*.mapbox.com"],
    "font-src": ["'self'", "data:"],
    "worker-src": ["'self'", "blob:"],
    "child-src": ["'self'", "blob:"],
    "form-action": ["'self'"],
  };
}

export function buildContentSecurityPolicy(nonce: string) {
  return Object.entries(buildDirectives(nonce))
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}
