export async function logApiRequest(
  path: string,
  method: string,
  duration: number,
  status: number,
) {
  console.log(
    JSON.stringify({
      type: "api_request",
      path,
      method,
      duration_ms: duration,
      status,
      timestamp: new Date().toISOString(),
    }),
  );
}
