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
    const storageDriver = process.env.STORAGE_DRIVER || 'local';

    logger.log(`Initializing storage driver: ${storageDriver}`);

    if (storageDriver === 's3') {
      if (!process.env.AWS_BUCKET) {
        throw new Error('AWS_BUCKET environment variable is required when STORAGE_DRIVER=s3');
      }
      logger.log(`Using S3 storage (bucket: ${process.env.AWS_BUCKET})`);
      return new S3StorageService(configService);
    }

    logger.log('Using local storage');
    return new LocalImageStorageService(configService);
  },
  inject: [AppConfigService],
};
