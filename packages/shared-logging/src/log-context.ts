import { AsyncLocalStorage } from 'async_hooks';
import { LogContext } from './logger';

const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

export function runWithContext<T>(context: LogContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

export function getLogContext(): LogContext {
  return asyncLocalStorage.getStore() || {};
}

export function addLogContext(context: LogContext): void {
  const current = getLogContext();
  Object.assign(current, context);
}

export function clearLogContext(): void {
  const current = getLogContext();
  Object.keys(current).forEach(key => delete current[key]);
}
