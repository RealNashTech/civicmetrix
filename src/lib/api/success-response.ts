export function apiSuccess(data: unknown) {
  return Response.json({
    success: true,
    data,
  });
}
