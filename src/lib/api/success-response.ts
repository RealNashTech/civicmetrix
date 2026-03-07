export function apiSuccess(data: unknown, status: number = 200) {
  return Response.json({
    success: true,
    data,
  }, { status });
}
