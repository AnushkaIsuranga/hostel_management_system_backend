import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { databaseModels } from './database.schemas';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = resolveMongoUri(configService);
        const dbName =
          configService.get<string>('MONGODB_DB_NAME') ||
          configService.get<string>('MongoDb__Database') ||
          undefined;

        return {
          uri,
          dbName,
          autoIndex: true,
          serverSelectionTimeoutMS: 10_000,
        };
      },
    }),
    MongooseModule.forFeature(databaseModels),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}

function resolveMongoUri(configService: ConfigService): string {
  const configuredUri =
    configService.get<string>('MONGODB_URI') ||
    configService.get<string>('MongoDb__Uri');

  if (configuredUri?.trim().startsWith('mongodb')) {
    return configuredUri.trim();
  }

  const username = configService.get<string>('MONGODB_USERNAME') || configService.get<string>('MongoDb__Username');
  const password = configService.get<string>('MONGODB_PASSWORD') || configService.get<string>('MongoDb__Password');
  const clusterHost =
    configService.get<string>('MONGODB_CLUSTER_HOST') || configService.get<string>('MongoDb__ClusterHost');
  const database = configService.get<string>('MONGODB_DB_NAME') || configService.get<string>('MongoDb__Database');

  if (username && password && clusterHost && database) {
    return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${clusterHost}/${database}?retryWrites=true&w=majority`;
  }

  throw new Error(
    'Missing MongoDB connection string. Set MONGODB_URI, or set MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_CLUSTER_HOST, and MONGODB_DB_NAME.',
  );
}
