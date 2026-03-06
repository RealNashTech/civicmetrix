import { AsyncLocalStorage } from "node:async_hooks";

export type ObservabilityContext = {
  requestId: string;
  tenantId?: string;
  userId?: string;
  route?: string;
  workerType?: string;
  jobId?: string;
};

const contextStorage = new AsyncLocalStorage<ObservabilityContext>();

export function runWithObservabilityContext<T>(context: ObservabilityContext, fn: () => T): T {
  return contextStorage.run(context, fn);
}

export function setObservabilityContext(context: Partial<ObservabilityContext>) {
  const current = contextStorage.getStore();
  if (!current) {
    if (!context.requestId) {
      return;
    }

    contextStorage.enterWith(context as ObservabilityContext);
    return;
  }

  contextStorage.enterWith({
    ...current,
    ...context,
  });
}

export function getObservabilityContext() {
  return contextStorage.getStore() ?? null;
}
