import 'dotenv/config';

import argon2 from 'argon2';
import mongoose from 'mongoose';

import { UserSchema } from './database.schemas';
import { UserRole } from '../common/enums/app.enums';

async function main() {
  const uri = resolveMongoUri();
  const fullName = process.env.AdminCredentials__FullName?.trim();
  const email = process.env.AdminCredentials__Email?.trim().toLowerCase();
  const password = process.env.AdminCredentials__Password;

  if (!fullName || !email || !password) {
    throw new Error('AdminCredentials__FullName, AdminCredentials__Email, and AdminCredentials__Password are required.');
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || process.env.MongoDb__Database || undefined,
    autoIndex: true,
  });

  const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
  const existingUser = await UserModel.findOne({ email }).lean().exec();
  const passwordHash = await argon2.hash(password);

  if (!existingUser) {
    await UserModel.create({
      fullName,
      email,
      phoneNumber: '',
      passwordHash,
      role: UserRole.Admin,
      lastActivityAt: new Date(),
      createdAt: new Date(),
      isDeleted: false,
    });
  } else {
    await UserModel.updateOne(
      { email },
      {
        $set: {
          fullName,
          passwordHash,
          role: UserRole.Admin,
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
        },
      },
    ).exec();
  }

  console.log(`Admin user seeded: ${email}`);
}

function resolveMongoUri() {
  const configuredUri = process.env.MONGODB_URI || process.env.MongoDb__Uri;
  if (configuredUri?.trim().startsWith('mongodb')) {
    return configuredUri.trim();
  }

  const username = process.env.MONGODB_USERNAME || process.env.MongoDb__Username;
  const password = process.env.MONGODB_PASSWORD || process.env.MongoDb__Password;
  const clusterHost = process.env.MONGODB_CLUSTER_HOST || process.env.MongoDb__ClusterHost;
  const database = process.env.MONGODB_DB_NAME || process.env.MongoDb__Database;

  if (username && password && clusterHost && database) {
    return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${clusterHost}/${database}?retryWrites=true&w=majority`;
  }

  throw new Error(
    'Missing MongoDB connection string. Set MONGODB_URI, or set MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_CLUSTER_HOST, and MONGODB_DB_NAME.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
