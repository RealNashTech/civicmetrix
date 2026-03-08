import client from "prom-client";

export const register = new client.Registry();

client.collectDefaultMetrics({
  register,
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests",
  labelNames: ["method", "route", "status"],
});

register.registerMetric(httpRequestDuration);
