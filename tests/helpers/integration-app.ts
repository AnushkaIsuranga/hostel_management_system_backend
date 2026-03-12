import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request, { SuperTest, Test } from 'supertest';

import { ProblemDetailsFilter } from '../../src/common/exceptions/problem-details.filter';

interface IntegrationHttpOptions {
  controllers: any[];
  providers: any[];
  globalPrefix?: string;
  guardOverrides?: Array<{
    guard: any;
    useValue: {
      canActivate: (...args: any[]) => boolean | Promise<boolean>;
    };
  }>;
  currentUser?: {
    userId: string;
    role: number;
  };
}

export interface IntegrationHttpContext {
  app: INestApplication;
  client: SuperTest<Test>;
}

export async function createIntegrationHttpApp(options: IntegrationHttpOptions): Promise<IntegrationHttpContext> {
  const moduleBuilder = NestTest.createTestingModule({
    controllers: options.controllers,
    providers: options.providers,
  });

  for (const override of options.guardOverrides ?? []) {
    moduleBuilder.overrideGuard(override.guard).useValue(override.useValue);
  }

  const moduleRef = await moduleBuilder.compile();

  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix(options.globalPrefix ?? 'api');
  app.use(cookieParser());
  if (options.currentUser) {
    app.use((req, _res, next) => {
      (req as any).user = options.currentUser;
      next();
    });
  }
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());

  await app.init();

  return {
    app,
    client: request(app.getHttpServer()),
  };
}
