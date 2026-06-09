import * as Sentry from "@sentry/nextjs";

export function captureApiError(error: unknown, context: { method: string; path: string; tenantId?: string }) {
  Sentry.withScope((scope) => {
    scope.setTag("type", "api-error");
    scope.setExtra("method", context.method);
    scope.setExtra("path", context.path);
    if (context.tenantId) scope.setUser({ id: context.tenantId });
    Sentry.captureException(error);
  });
}

export function captureServerActionError(error: unknown, context: { action: string; tenantId?: string }) {
  Sentry.withScope((scope) => {
    scope.setTag("type", "server-action-error");
    scope.setExtra("action", context.action);
    scope.setExtra("args", JSON.stringify(context));
    if (context.tenantId) scope.setUser({ id: context.tenantId });
    Sentry.captureException(error);
  });
}

export function captureCronError(error: unknown, context: { job: string }) {
  Sentry.withScope((scope) => {
    scope.setTag("type", "cron-error");
    scope.setExtra("job", context.job);
    Sentry.captureException(error);
  });
}

export function captureAiAgentError(error: unknown, context: { agent: string; action: string; tenantId?: string }) {
  Sentry.withScope((scope) => {
    scope.setTag("type", "ai-agent-error");
    scope.setExtra("agent", context.agent);
    scope.setExtra("action", context.action);
    if (context.tenantId) scope.setUser({ id: context.tenantId });
    Sentry.captureException(error);
  });
}
