import { expect } from 'vitest';

export async function getThrownError<T>(action: Promise<T> | (() => Promise<T>)): Promise<unknown> {
  try {
    if (typeof action === 'function') {
      await action();
    } else {
      await action;
    }
    throw new Error('Expected action to throw, but it resolved successfully.');
  } catch (error) {
    return error;
  }
}

export async function expectAppException<T>(
  action: Promise<T> | (() => Promise<T>),
  exceptionClass: new (...args: any[]) => Error,
  messageIncludes?: string,
): Promise<void> {
  const error = await getThrownError(action);
  expect(error).toBeInstanceOf(exceptionClass);

  if (messageIncludes) {
    expect(String((error as Error).message)).toContain(messageIncludes);
  }
}
