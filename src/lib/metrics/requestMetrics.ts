import {
  civicHttpRequestDurationSeconds,
  civicHttpRequestsTotal,
} from "@/lib/metrics/metrics";

type RequestContext = {
  method: string;
  route: string;
};

export async function withRequestMetrics<T extends Response>(
  context: RequestContext,
  handler: () => Promise<T>,
): Promise<T> {
  const startedAt = process.hrtime.bigint();

  try {
    const response = await handler();
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    const status = String(response.status);

    civicHttpRequestsTotal.inc({
      method: context.method,
      route: context.route,
      status,
    });

    civicHttpRequestDurationSeconds.observe(
      {
        method: context.method,
        route: context.route,
      },
      durationSeconds,
    );

    return response;
  } catch (error) {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

    civicHttpRequestsTotal.inc({
      method: context.method,
      route: context.route,
      status: "500",
    });

    civicHttpRequestDurationSeconds.observe(
      {
        method: context.method,
        route: context.route,
      },
      durationSeconds,
    );

    throw error;
  }
}
