# Storage Abstraction Layer - Implementation Guide

## Overview

The backend now uses a **storage abstraction layer** that supports both local filesystem storage (development) and AWS S3 storage (production/staging). This allows the same codebase to work in both local development and cloud environments without code changes.

## Architecture

### Storage Service Interface

[storage.interface.ts](storage.interface.ts) defines the contract:

```ts
interface StorageService {
  uploadImage(file: Express.Multer.File, hostelId: string): Promise<StoredImageResult>;
  deleteImage(imageUrl: string): Promise<boolean>;
}
```

### Two Implementations

1. **LocalImageStorageService** - Stores files on local disk (`wwwroot/uploads/`)
2. **S3StorageService** - Stores files on AWS S3

### Factory Provider

[storage.provider.ts](storage.provider.ts) chooses the implementation based on the `STORAGE_DRIVER` environment variable.

## Configuration

### Development (Local Storage)

**`.env`:**
```env
STORAGE_DRIVER=local
# No AWS credentials needed
```

**Behavior:**
- Files uploaded to: `wwwroot/uploads/hostels/{hostelId}/full/{fileName}.webp`
- Also creates variants: `thumbnail` and `card` folders
- Perfect for development - no external dependencies

### Production/Staging (S3 Storage)

**`.env`:**
```env
STORAGE_DRIVER=s3
AWS_REGION=us-east-1
AWS_BUCKET=hostel-production-storage
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

**Behavior:**
- Files uploaded to: `https://{bucket}.s3.{region}.amazonaws.com/uploads/hostels/{hostelId}/full/{fileName}.webp`
- Only one full-size variant stored (memory-efficient)
- Files are immediately available globally via S3

See [.env.s3.example](.env.s3.example) for detailed configuration and AWS setup instructions.

## How It Works

### Upload Flow

```
Express Controller
    ↓
HostelImagesService
    ↓
StorageService (interface)
    ↓
    ├─→ LocalImageStorageService  (if STORAGE_DRIVER=local)
    └─→ S3StorageService            (if STORAGE_DRIVER=s3)
    ↓
Returns: { imageUrl, fileSize, contentType, storedFileName }
```

### Upload Process

1. **Validation**: Checks file size (max 5MB) and mime type (jpeg, png, webp)
2. **Processing**: Converts to WebP format with 80% quality
3. **Storage**:
   - **Local**: Saves three variants (thumbnail 300px, card 600px, full 1200px)
   - **S3**: Saves only full variant (1200px) to reduce storage cost
4. **Return**: URL that can be immediately served to clients

### Delete Flow

```
HostelImagesService
    ↓
StorageService.deleteImage(url)
    ↓
    ├─→ LocalImageStorageService  - Deletes from filesystem
    └─→ S3StorageService            - Deletes object from S3
```

## Docker Deployment

### Production with S3

```bash
docker build -t hostel-api:latest .
docker run \
  -e STORAGE_DRIVER=s3 \
  -e AWS_REGION=us-east-1 \
  -e AWS_BUCKET=hostel-production-storage \
  -e AWS_ACCESS_KEY_ID=$AWS_KEY \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET \
  -p 3000:3000 \
  hostel-api:latest
```

**Why this works:**
- Container is ephemeral - no persistent storage needed
- Files live in S3, not in container
- Scale infinitely - each container is independent
- No shared volumes required

### Local Development with Docker

```bash
# Uses local storage by default
docker build -t hostel-api:dev .
docker run -p 3000:3000 hostel-api:dev
```

**Note:** With local storage in Docker, files are stored in container's `wwwroot/uploads/` and will be lost when container stops. For persistent local dev, run without Docker.

## AWS Setup

### 1. Create IAM User

```bash
aws iam create-user --user-name hostel-api-s3
aws iam attach-user-policy \
  --user-name hostel-api-s3 \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam create-access-key --user-name hostel-api-s3
```

### 2. Create S3 Bucket

```bash
aws s3api create-bucket \
  --bucket hostel-production-storage \
  --region us-east-1
```

### 3. Enable Versioning (Optional but Recommended)

```bash
aws s3api put-bucket-versioning \
  --bucket hostel-production-storage \
  --versioning-configuration Status=Enabled
```

### 4. Set Lifecycle Policy (Save Costs)

```bash
# Delete files older than 365 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket hostel-production-storage \
  --lifecycle-configuration file://lifecycle.json
```

See [.env.s3.example](.env.s3.example) for the IAM policy JSON.

## Testing

### Unit Tests

The existing tests mock the storage service:

```ts
const storage = makeStorage(); // Returns mock with uploadImage/deleteImage
const service = new HostelImagesService(prisma, storage);
```

Tests work the same for both implementations.

### Integration Tests

```bash
# Uses local storage from .env
npm run test:integration

# To test S3 in integration:
# 1. Set STORAGE_DRIVER=s3 in .env
# 2. Provide AWS credentials
# 3. Run: npm run test:integration
```

## Migration from Local to S3

If you already have images stored locally, you can migrate them:

```bash
# 1. Export images from local storage
aws s3 sync wwwroot/uploads/hostels s3://hostel-production-storage/uploads/hostels

# 2. Verify migration
aws s3 ls s3://hostel-production-storage/uploads/hostels/ --recursive

# 3. Update .env to use S3
STORAGE_DRIVER=s3

# 4. Restart application
```

## Troubleshooting

### S3 Upload Fails

**Error:** `AWS_BUCKET environment variable is not configured.`
- **Fix:** Set `AWS_BUCKET` in `.env`

**Error:** `Failed to upload image to S3`
- Check AWS credentials have S3 permissions
- Verify bucket exists and is accessible
- Check S3 bucket policy allows the IAM user

### Local Storage Issues

**Error:** `EACCES: permission denied, mkdir...`
- Run app with write permissions to `wwwroot/`
- For Docker: mount volume with write permissions

**Error:** `Files disappear after container restart`
- This is expected behavior in Docker
- Use S3 for production, or mount host volume for development

### Wrong Storage Driver

**Problem:** Using local storage in production
- **Risk**: Files lost when container restarts
- **Fix**: Set `STORAGE_DRIVER=s3` in production `.env`

**Problem:** Using S3 in development without credentials
- **Fix**: Set `STORAGE_DRIVER=local` for development

## Performance Notes

### Local Storage
- **Pros**: Fast, no network latency, no AWS costs
- **Cons**: Filesystem I/O, ephemeral in containers

### S3 Storage
- **Pros**: Durable, scalable, globally accessible, CDN-ready
- **Cons**: Network latency, AWS costs (~$0.023 per GB stored)

### Optimization

For production, consider:

1. **CloudFront CDN**: Cache images at edge locations
   ```
   S3 → CloudFront → Clients
   ```

2. **Image Optimization**: Use Lambda@Edge to optimize images

3. **Lifecycle Policies**: Move old images to cheaper storage tiers

4. **Multi-Region Replication**: For global redundancy

## Code Examples

### Using the Service in Controllers

```ts
@Post('upload')
@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
async uploadImage(
  @UploadedFile() file: Express.Multer.File,
  @Body('hostelId') hostelId: string,
) {
  const result = await this.storageService.uploadImage(file, hostelId);
  return { imageUrl: result.imageUrl };
}
```

### In Services

```ts
@Injectable()
export class MyService {
  constructor(private readonly storageService: StorageService) {}

  async storeImage(file: Express.Multer.File) {
    return await this.storageService.uploadImage(file, 'hostel-123');
  }

  async removeImage(imageUrl: string) {
    return await this.storageService.deleteImage(imageUrl);
  }
}
```

## References

- [AWS SDK for JavaScript (S3)](https://docs.aws.amazon.com/sdk-for-javascript/)
- [NestJS Guide to File Upload](https://docs.nestjs.com/techniques/file-upload)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/BestPractices.html)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
