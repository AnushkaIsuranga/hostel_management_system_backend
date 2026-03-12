import { Logger } from '@nestjs/common';

export function silenceNestLogger(): () => void {
  Logger.overrideLogger([]);

  return () => {
    Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  };
}
