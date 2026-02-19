import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { KaspaRpcRequestError } from "../kaspa/kaspaRpcClient";

export class HttpError extends Error {
  public readonly statusCode: number;

  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    req.log.warn({ issues: err.issues }, "Validation error");
    res.status(400).json({
      error: "Bad Request",
      message: "Invalid request payload",
      details: err.issues
    });
    return;
  }

  if (err instanceof HttpError) {
    req.log.warn({ err, details: err.details }, "Request failed");
    res.status(err.statusCode).json({
      error: "Request Failed",
      message: err.message,
      details: err.details
    });
    return;
  }

  if (err instanceof KaspaRpcRequestError) {
    req.log.error({ err }, "Kaspa RPC call failed");
    res.status(err.statusCode).json({
      error: "Upstream Failure",
      message: err.message
    });
    return;
  }

  req.log.error({ err }, "Unhandled error");
  res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred"
  });
}
