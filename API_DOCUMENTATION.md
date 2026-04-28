# Hostel Management System Backend API Documentation

Last updated from source code: 2026-03-11

This documentation is aligned with the current NestJS + Mongoose implementation in:
- `src/main.ts`
- `src/**/*.controller.ts`
- `src/**/*.service.ts`
- `src/**/*.dto.ts`
- `src/database/database.schemas.ts`
- `src/database/seed.ts`

## 1) Runtime and Base URL

<<<<<<< Updated upstream
- Runtime: NestJS 11, Prisma, PostgreSQL
- Default development base URL: `http://localhost:3000`
=======
### Environment URLs

| Environment | URL | Database | Storage |
|-------------|-----|----------|---------|
| Development | `http://localhost:3000` | Local MongoDB | Local (`wwwroot/`) |
| **Staging** | **`https://staging.unihome.lk`** | MongoDB Atlas | AWS S3 |
| **Production** | **`https://api.unihome.lk`** | MongoDB Atlas | AWS S3 |

### Configuration

- Runtime: NestJS 11, Mongoose, MongoDB
>>>>>>> Stashed changes
- API base path: `/api`
- Static files are served from `wwwroot`
- Uploaded hostel images are publicly reachable under `/uploads/...`
- Swagger is not configured in the current source
- HTTPS is not configured in the Nest bootstrap code

<<<<<<< Updated upstream
Port is configurable through `PORT`. The checked-in `.env.example` uses `3000`.
=======
### Deployment Notes

- **Staging (Render)**: Automatic deploys from GitHub, MongoDB Atlas, SSL auto-renewed
- **Production (AWS)**: Manual deployment via EC2, MongoDB Atlas, ACM SSL certificate
- See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup and [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md) for quick reference
- Domain: `unihome.lk` (see [DNS_SETUP.md](DNS_SETUP.md) for DNS configuration)
>>>>>>> Stashed changes

## 2) Authentication and Session

### 2.1 Access token (JWT)

- Issued by:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/refresh`
- Send on protected routes:
  - `Authorization: Bearer <accessToken>`
- JWT payload fields:
  - `sub` = user id
  - `email`
  - `role` = string role name: `Student`, `Owner`, or `Admin`

### 2.2 Refresh token cookie

- Stored as HttpOnly cookie
- Cookie name: `AuthSettings__RefreshCookieName` (default `refreshToken`)
- Cookie options:
  - `HttpOnly = true`
  - `SameSite = Strict`
  - `Secure = NODE_ENV === 'production'`
- Student/Owner refresh cookies are persistent and use the token expiry as `Expires`
- Admin refresh cookies are session cookies and do not set `Expires`

### 2.3 Session behavior

- Refresh tokens are stored hashed in `RefreshToken.tokenHash`
- Refresh rotates the current refresh token and revokes the previous one
- Admin refresh sessions expire after inactivity:
  - `AuthSettings__AdminIdleTimeoutMinutes` default: `30`
- Access token lifetimes:
  - User access token default: `15` minutes
  - Admin access token default: `15` minutes
- Refresh lifetimes:
  - Student/Owner default: `1` day
  - Student/Owner with `rememberMe`: `30` days
  - Admin default: `12` hours

### 2.4 Activity tracking middleware

- A global middleware attempts to read any bearer token on every request
- If the token is valid:
  - `req.user` is populated even on public routes
  - `User.lastActivityAt` is updated
- Invalid bearer tokens on public routes are ignored by middleware

This matters for `POST /api/hostels/search`: the route is public, but if a valid bearer token is present the backend can use saved student preferences as fallback input.

### 2.5 Auth endpoints

- `POST /api/auth/login`
  - Public
  - Body: `LoginRequestDto`
    - `email`
    - `password`
    - `rememberMe?`
  - Returns: `AuthTokensResponseDto`
  - Sets refresh cookie

- `POST /api/auth/register`
  - Public
  - Body: `UserRegisterDto`
    - `fullName`
    - `email`
    - `phoneNumber`
    - `password`
  - Creates a new `Student` user
  - Returns: `AuthTokensResponseDto`
  - Sets refresh cookie

- `POST /api/auth/refresh`
  - Public, cookie-based
  - Reads refresh token from cookie
  - Returns a new `AuthTokensResponseDto`
  - Rotates refresh cookie

- `POST /api/auth/logout`
  - Public
  - Reads refresh token from cookie if present
  - Revokes matching refresh token hash if found
  - Clears refresh cookie
  - Returns `204 No Content`

## 3) CORS

- Config source: `Cors__AllowedOrigins`
- If configured origins exist:
  - `origin = allowedOrigins`
  - `credentials = true`
  - methods: `GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS`
  - allowed headers: `Content-Type`, `Authorization`
- If no configured origins exist:
  - `origin = true`
  - `credentials = false`
  - methods: `GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS`

## 4) Serialization and Conventions

- JSON property naming is camelCase because DTO field names are camelCase
- Enums are serialized as integers in responses
- UUID values are strings
- `Date` values serialize as ISO-8601 strings
- Soft delete is implemented per service with `isDeleted` checks, not by a global database filter
- Some relations are hard-deleted instead of soft-deleted:
  - `HostelAmenity`
  - cleanup-time removal of old soft-deleted hostels and related records
- Request validation is mostly implemented manually inside services, not via DTO decorators
- `ValidationPipe` is enabled with:
  - `transform = true`
  - `whitelist = false`
  - implicit conversion enabled

## 5) Current Domain Notes

### 5.1 Hostel

`Hostel` includes:
- `ownerId`
- `isVerified`
- `verifiedAt`
- `verifiedByAdminId`
- `verificationStatus`
- `latitude`
- `longitude`
- `googleMapsUrl`
- `images`
- `subscription`
- `verificationRequests`

### 5.2 Hostel verification status enum

`HostelVerificationStatus`:
- `0 = None`
- `1 = Pending`
- `2 = Approved`
- `3 = Rejected`
- `4 = Expired`

### 5.3 Hostel images

Each hostel can store up to `8` active images.

`HostelImage` includes:
- `id`
- `hostelId`
- `fileName`
- `contentType`
- `fileSize`
- `imageUrl`
- `displayOrder`
- `createdAt`
- `updatedAt`

Storage behavior:
- Database stores metadata plus `imageUrl`
- Current storage implementation is local filesystem under `wwwroot/uploads/hostels/...`
- Uploads are converted to WebP variants:
  - `thumbnail` max width `300`
  - `card` max width `600`
  - `full` max width `1200`
- Stored `imageUrl` points to the `full` variant
- `ImageStorage__CdnBaseUrl` can prepend a CDN/public host

### 5.4 Student preferences

`StudentPreference` stores:
- `userId`
- `universityId`
- `minBudget`
- `maxBudget`
- `requiredCapacity`
- `selectedAmenitiesJson`
- `priorityOrderJson`
- `priceWeight`
- `distanceWeight`
- `ratingWeight`

## 6) Background Processing

### 6.1 Subscription monitor

Hosted service: `SubscriptionMonitorService`
- Runs immediately on module init, then every `12` hours
- Calls `HostelSubscriptionsService.processExpirationsAndReminders()`

Current workflow:
- Finds active subscriptions with `expiryDate < now`
- Marks subscription inactive
- Marks hostel unverified and `verificationStatus = Expired`
- Logs an expiry email notification
- Finds active subscriptions expiring within `3` days
- Sends at most one reminder per day by updating `lastReminderSentAt`

### 6.2 Deleted hostel cleanup

Hosted service: `CleanupDeletedDataService`
- Runs immediately on module init, then every `DataCleanup__RunIntervalHours`
- Default interval: `24` hours
- Default retention: `60` days

Current workflow:
- Finds soft-deleted hostels older than retention
- Deletes stored image files for those hostels
- Permanently deletes related records and the hostel row

## 7) Seed Behavior

The container starts the NestJS app directly. There is no Prisma migration step in the MongoDB build.

`src/database/seed.ts` upserts the configured admin user by `AdminCredentials__Email`, and `AdminBootstrapService` also synchronizes that account on app startup when the admin env values are present.

Required env vars:
- `AdminCredentials__FullName`
- `AdminCredentials__Email`
- `AdminCredentials__Password`

## 8) Endpoints

All endpoints below are under `/api`.

## 8.1 Users (`/users`)

- `GET /users`
  - Public
- `GET /users/stats`
  - Public
  - Returns dashboard summary counts:
    - `hostels.totalCount`
    - `hostels.last7DaysCount`
    - `users.totalCount` (excludes admin users)
    - `users.last7DaysCount` (excludes admin users)
    - `reviews.totalCount` (excludes reviews by admin users)
    - `reviews.last7DaysCount` (excludes reviews by admin users)
- `GET /users/role/{role}`
  - Public
  - Returns users filtered by role
  - `role` accepts: `Student`, `Owner`, `Admin`, or numeric values `0`, `1`, `2`
- `GET /users/{id}`
  - Public

- `POST /users`
  - Public
  - Body: `UserCreateDto`
    - `fullName`
    - `email`
    - `phoneNumber`
    - `role`
  - Important: this route creates a user with an empty `passwordHash`
  - Use `POST /auth/register` for normal login-capable user creation

- `PUT /users/{id}`
  - Public
  - Body: `UserUpdateDto`
    - `fullName`
    - `phoneNumber`
    - `role`

- `DELETE /users/{id}`
  - Authenticated
  - Admin can delete any non-admin user
  - Non-admin can delete only their own profile
  - Admin users cannot be deleted through this endpoint
  - Soft delete: sets `isDeleted = true`

## 8.2 Universities (`/universities`)

- `GET /universities`
  - Public

- `GET /universities/{id}`
  - Public

- `POST /universities`
  - Public
  - Body: `UniversityCreateDto`
    - `name`
    - `latitude`
    - `longitude`
  - Validation:
    - latitude must be between `-90` and `90`
    - longitude must be between `-180` and `180`

- `PUT /universities/{id}`
  - Public
  - Body: `UniversityUpdateDto`
  - Same coordinate validation as create

- `DELETE /universities/{id}`
  - Public
  - Soft delete

## 8.3 Amenities (`/amenities`)

- `GET /amenities`
  - Public

- `GET /amenities/{id}`
  - Public

- `POST /amenities`
  - Public
  - Body: `AmenityCreateDto`
    - `name`
  - Behavior:
    - `name` can be comma-separated
    - creates any missing amenity names
    - returns the first newly created amenity
    - if all provided names already exist, returns `409`

- `PUT /amenities/{id}`
  - Public
  - Body: `AmenityUpdateDto`
    - `name`
  - Behavior:
    - comma-separated names are supported
    - first value renames the target amenity
    - remaining new values are created as new amenities

- `DELETE /amenities/{id}`
  - Public
  - Soft delete

## 8.4 Rooms (`/rooms`)

- `GET /rooms`
  - Public

- `GET /rooms/{id}`
  - Public

- `POST /rooms`
  - Public
  - Body: `RoomCreateDto`
    - `hostelId`
    - `roomType`
    - `price`
    - `capacity`
    - `isAvailable`

- `PUT /rooms/{id}`
  - Public
  - Body: `RoomUpdateDto`
    - `roomType`
    - `price`
    - `capacity`
    - `isAvailable`

- `DELETE /rooms/{id}`
  - Public
  - Soft delete

## 8.5 Hostels (`/hostels`)

- `GET /hostels`
  - Public
  - Returns non-deleted hostels only
  - If a hostel has no active `HostelImage` rows, the service falls back to image files found under `wwwroot/uploads`

- `GET /hostels/{id}`
  - Public

- `POST /hostels/search`
  - Public
  - Optionally benefits from a valid bearer token because saved student preferences can be used as fallback
  - Body: `HostelSearchRequestDto`
    - `minBudget?`
    - `maxBudget?`
    - `genderPolicy?`
    - `requiredCapacity?`
    - `universityId?`
    - `amenityIds?`
    - `weights?`
      - `priceWeight`
      - `distanceWeight`
      - `ratingWeight`
  - Search behavior:
    - hard filters apply only for values explicitly sent in the request
    - if authenticated and `universityId` is missing, the service falls back to saved `StudentPreference.universityId`
    - if authenticated and `weights` are missing, the service falls back to saved preference weights
    - if there is still no effective `universityId`, returns `400`
    - base weighted score uses price, distance, and rating
    - weights are normalized to sum `1.0`
    - default weights when none are available: `0.4 / 0.4 / 0.2`
    - saved budget, capacity, and amenity preferences are used as a ranking boost, not as hard filters
    - final result includes:
      - `hostel`
      - `distanceKm`
      - `averageRating`
      - `score`

- `POST /hostels`
  - Auth required (`Bearer` token)
  - Allowed roles: `Owner`, `Admin`
  - Body: `HostelCreateDto`
    - `name`
    - `description`
    - `city`
    - `address`
    - `minPrice`
    - `maxPrice`
    - `genderPolicy`
    - `latitude?`
    - `longitude?`
    - `googleMapsUrl?`
    - `status`
    - `images?` as `string[]`
  - Owner behavior:
    - `ownerId` is derived from the authenticated user
    - clients should not send `ownerId` in the request body
  - Location behavior:
    - accepts explicit `latitude` and `longitude`
    - otherwise requires `googleMapsUrl`
    - short links are resolved through redirect hops before coordinate extraction
    - accepted coordinate patterns include `@lat,lng`, `q=lat,lng`, and place-data fragments
    - stored `googleMapsUrl` is rewritten to canonical `https://www.google.com/maps?q=lat,lng`
  - Image URL behavior:
    - image URL arrays are accepted directly in this route
    - max `8` values
    - these are stored as metadata rows with `contentType = application/octet-stream` and `fileSize = 0`

- `PUT /hostels/{id}`
  - Public
  - Body: `HostelUpdateDto`
  - Same coordinate behavior as create
  - If `images` is provided and non-empty:
    - current active `HostelImage` rows are soft-deleted
    - new rows are created from the provided URLs
  - If `images` is omitted or empty:
    - existing image rows are left unchanged

- `DELETE /hostels/{id}`
  - Public
  - Soft deletes hostel and active hostel images

- `POST /hostels/{id}/restore`
  - Public
  - Restores a soft-deleted hostel and its soft-deleted images
  - Restore window: `60` days from `deletedAt`

## 8.6 Hostel Listings (`/hostellistings`)

- `GET /hostellistings`
  - Public

- `GET /hostellistings/{id}`
  - Public

- `POST /hostellistings`
  - Public
  - Body: `HostelListingCreateDto`
    - `hostelId`
    - `ownerUserId`
    - `status`
  - If `status` is omitted by the caller, service defaults to `Pending`
  - Unique on `(hostelId, ownerUserId)`

- `PUT /hostellistings/{id}`
  - Public
  - Body: `HostelListingUpdateDto`
    - `status`

- `DELETE /hostellistings/{id}`
  - Public
  - Soft delete

## 8.7 Hostel Amenities (`/hostel-amenities`)

- `GET /hostel-amenities`
  - Public

- `GET /hostel-amenities/{hostelId}/{amenityId}`
  - Public
  - Returns the join row or `null` if it does not exist

- `POST /hostel-amenities`
  - Public
  - Body: `HostelAmenityCreateDto`
    - `hostelId`
    - `amenityId`

- `POST /hostel-amenities/by-names`
  - Public
  - Body: `HostelAmenityBulkCreateDto`
    - `hostelId`
    - `amenityNames` as comma-separated string
  - Behavior:
    - splits and trims names
    - creates missing amenities
    - links all parsed amenities to the hostel
    - existing links are returned instead of failing

- `DELETE /hostel-amenities/{hostelId}/{amenityId}`
  - Public
  - Hard deletes the join row

## 8.8 Interaction Events (`/interactionevents`)

- `GET /interactionevents`
  - Public

- `GET /interactionevents/{id}`
  - Public

- `POST /interactionevents`
  - Public
  - Body: `InteractionEventCreateDto`
    - `userId?`
    - `hostelId?`
    - `eventType`
    - `eventData?`
    - `sessionId`

- `PUT /interactionevents/{id}`
  - Public
  - Body: `InteractionEventUpdateDto`

- `DELETE /interactionevents/{id}`
  - Public
  - Soft delete

`InteractionType`:
- `0 = ViewHostel`
- `1 = Search`
- `2 = FilterApply`
- `3 = Save`
- `4 = ContactOwner`

## 8.9 Student Preferences (`/student-preferences`)

- `GET /student-preferences/me`
  - Authenticated
  - Returns current user's saved preferences
  - Returns `404` if none exist

- `PUT /student-preferences/me`
  - Authenticated
  - Body: `StudentPreferenceUpsertDto`
    - `universityId`
    - `minBudget?`
    - `maxBudget?`
    - `requiredCapacity?`
    - `selectedAmenities?` as `string[]`
    - `priorityOrder?` as `string[]`
    - `weights?`
      - `price`
      - `distance`
      - `rating`
  - Validation:
    - `universityId` is required
    - university must exist and not be soft-deleted
    - `minBudget` and `maxBudget` cannot be negative
    - if both are present, `minBudget <= maxBudget`
    - `requiredCapacity` must be greater than `0`
    - each `selectedAmenities` value must match an existing amenity name
    - `priorityOrder` must contain exactly `price`, `distance`, `rating`
    - weights cannot be negative
    - at least one weight must be greater than `0`
  - Weight behavior:
    - if `weights` is omitted, weights are derived from `priorityOrder`
    - derived weights are `0.5`, `0.3`, `0.2`
    - if `priorityOrder` is also omitted, default order is `price`, `distance`, `rating`
    - provided weights are normalized to sum `1.0`

## 8.10 Hostel Reviews (`/hostels/{hostelId}/reviews`)

- `GET /hostels/{hostelId}/reviews`
  - Public

- `GET /hostels/{hostelId}/reviews/summary`
  - Public
  - Returns:
    - `hostelId`
    - `averageRating`
    - `reviewCount`

- `POST /hostels/{hostelId}/reviews`
  - Authenticated
  - Body: `HostelReviewCreateDto`
    - `rating`
    - `comment?`
  - Validation:
    - `rating` must be between `1` and `5`
    - `comment` max length `1000`
  - A user can review a hostel only once

- `PUT /hostels/{hostelId}/reviews/{reviewId}`
  - Authenticated
  - Review owner or admin only
  - Body: `HostelReviewUpdateDto`

- `DELETE /hostels/{hostelId}/reviews/{reviewId}`
  - Authenticated
  - Review owner or admin only
  - Soft delete

## 8.11 Hostel Verification

- `POST /hostels/{hostelId}/verification/request`
  - Authenticated
  - Hostel owner only
  - Creates a pending verification request
  - Also updates hostel `verificationStatus` to `Pending`
  - Only one active pending request is allowed at a time

- `GET /hostels/{hostelId}/verification/requests`
  - Authenticated
  - Hostel owner for that hostel or admin only

- `POST /verification-requests/{requestId}/approve`
  - Authenticated
  - Admin only
  - Body: `ReviewVerificationRequestDto`
    - `adminNotes?`
  - Sets request status to `Approved`
  - Sets hostel:
    - `isVerified = true`
    - `verifiedAt = now`
    - `verifiedByAdminId = adminId`
    - `verificationStatus = Approved`

- `POST /verification-requests/{requestId}/reject`
  - Authenticated
  - Admin only
  - Body: `ReviewVerificationRequestDto`
  - Sets request status to `Rejected`
  - Sets hostel:
    - `isVerified = false`
    - `verifiedAt = null`
    - `verifiedByAdminId = adminId`
    - `verificationStatus = Rejected`

## 8.12 Hostel Subscription (`/hostels/{hostelId}/subscription`)

- `GET /hostels/{hostelId}/subscription`
  - Authenticated
  - Hostel owner or admin only
  - Returns `404` if no active subscription row exists

- `PUT /hostels/{hostelId}/subscription`
  - Authenticated
  - Hostel owner or admin only
  - Body: `UpsertHostelSubscriptionDto`
    - `startDate`
    - `expiryDate`
  - Validation:
    - `expiryDate` must be greater than `startDate`
  - Behavior:
    - creates or updates the subscription row
    - sets `isActive` based on whether `expiryDate > now`
    - if expired, hostel is marked unverified and `verificationStatus = Expired`
    - if the hostel was previously `Expired` and the new subscription is active, hostel `verificationStatus` is moved back to `Pending`

## 8.13 Hostel Images (`/hostelimages`)

- `GET /hostelimages/{hostelId}`
  - Public
  - Returns active images ordered by `displayOrder`, then `createdAt`

- `POST /hostelimages/{hostelId}`
  - Authenticated
  - Hostel owner or admin only
  - Body: `multipart/form-data`
    - `file` required
    - `displayOrder` optional
  - Returns `200 OK`
  - Validation:
    - max file size `5MB`
    - allowed MIME types:
      - `image/jpeg`
      - `image/png`
      - `image/webp`
    - max `8` active images per hostel

- `DELETE /hostelimages/{imageId}`
  - Authenticated
  - Hostel owner or admin only
  - Soft deletes DB row and deletes stored files

- `PUT /hostelimages/{imageId}/order`
  - Authenticated
  - Hostel owner or admin only
  - Body: `UpdateHostelImageOrderDto`
    - `displayOrder`
  - Validation:
    - `displayOrder >= 0`
  - Returns `204 No Content`

## 9) Error Shape

Errors are returned as problem details with content type `application/problem+json`.

Common fields:
- `status`
- `title`
- `detail`
- `instance`
- `errorCode` when available

Common statuses:
- `200`
- `201`
- `204`
- `400`
- `401`
- `403`
- `404`
- `409`
- `500`

## 10) Notes

- The current codebase uses `DatabaseService`, a Mongoose-backed data adapter shared by the feature services
- There is no dedicated `EmailService` in the NestJS implementation; subscription reminder and expiry notifications are currently log messages inside `HostelSubscriptionsService`
- Most CRUD modules are currently public in the controller layer:
  - `users` except delete
  - `universities`
  - `amenities`
  - `rooms`
  - `hostels`
  - `hostellistings`
  - `hostel-amenities`
  - `interactionevents`
- Auth is enforced only on routes that explicitly use `JwtAuthGuard`
