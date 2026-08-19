export class SmartCompactionError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "SmartCompactionError";
  }
}

export class TargetResolutionError extends SmartCompactionError {
  constructor(message: string, options?: ErrorOptions) {
    super("target", message, options);
    this.name = "TargetResolutionError";
  }
}

export class EmptySummaryError extends SmartCompactionError {
  constructor(message = "summarization produced no text summary content") {
    super("empty-summary", message);
    this.name = "EmptySummaryError";
  }
}

export class SummaryValidationError extends SmartCompactionError {
  constructor(message: string) {
    super("invalid-summary", message);
    this.name = "SummaryValidationError";
  }
}

export class OverflowSplitError extends SmartCompactionError {
  constructor(message: string) {
    super("overflow-atomic", message);
    this.name = "OverflowSplitError";
  }
}

export function errorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export function isContextOverflow(error: unknown): boolean {
  const code = errorCode(error);
  if (code === "CONTEXT_WINDOW_EXCEEDED") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /context.?window.?exceeded|maximum context|too many tokens|prompt is too long/i.test(
    message,
  );
}
