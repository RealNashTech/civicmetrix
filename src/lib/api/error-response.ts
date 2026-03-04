export function apiError(message: string, status: number = 400) {
  return Response.json(
    {
      success: false,
      error: {
        message,
      },
    },
    { status },
  );
}
