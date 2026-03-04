const requests = new Map<string, number[]>();

export function rateLimit(ip: string) {
  const now = Date.now();
  const windowMs = 60_000;

  if (!requests.has(ip)) {
    requests.set(ip, []);
  }

  const timestamps = (requests.get(ip) ?? []).filter((timestamp) => now - timestamp < windowMs);
  timestamps.push(now);
  requests.set(ip, timestamps);

  if (timestamps.length > 60) {
    throw new Error("Rate limit exceeded");
  }
}
