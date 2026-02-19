import type { NextFunction, Request, Response } from "express";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry, prefix: "kaspa_balance_api_" });

const requestDurationSeconds = new Histogram({
  name: "kaspa_balance_api_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

const requestTotal = new Counter({
  name: "kaspa_balance_api_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegistry]
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedNs = process.hrtime.bigint() - startedAt;
    const elapsedSeconds = Number(elapsedNs) / 1_000_000_000;
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode)
    };

    requestDurationSeconds.labels(labels.method, labels.route, labels.status_code).observe(elapsedSeconds);
    requestTotal.labels(labels.method, labels.route, labels.status_code).inc();
  });

  next();
}
