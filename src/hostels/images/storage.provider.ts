import { Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { StorageService } from './storage.interface';
import { LocalImageStorageService } from './local-image-storage.service';
import { S3StorageService } from './s3-storage.service';

const logger = new Logger('StorageProvider');

export const STORAGE_SERVICE_TOKEN = 'StorageService';

export const StorageProvider = {
  provide: STORAGE_SERVICE_TOKEN,
  useFactory: (configService: AppConfigService): StorageService => {
    const explicitDriver = process.env.STORAGE_DRIVER?.trim().toLowerCase();
    const databaseUrl = process.env.DATABASE_URL ?? '';
    const usesLocalDatabase = /localhost|127\.0\.0\.1/i.test(databaseUrl);

    const storageDriver =
      explicitDriver === 'local' || explicitDriver === 's3'
        ? explicitDriver
        : configService.nodeEnv === 'development' || usesLocalDatabase
          ? 'local'
          : 's3';

    logger.log(`Initializing storage driver: ${storageDriver}${explicitDriver ? ` (explicit: ${explicitDriver})` : ' (auto)'}`);

    if (storageDriver === 's3') {
      const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET;
      if (!bucket) {
        throw new Error('AWS_S3_BUCKET (or AWS_BUCKET) environment variable is required when using S3 storage.');
      }
      logger.log(`Using S3 storage (bucket: ${bucket})`);
      return new S3StorageService(configService);
    }

    logger.log('Using local storage');
    return new LocalImageStorageService(configService);
  },
  inject: [AppConfigService],
};
