# Hostel Management System Backend API Documentation

Last updated from source code: 2026-03-08

This documentation is aligned with the current implementation in:
- `Program.cs`
- `Controllers/*`
- `Dtos/*`
- `Services/*`
- `Repositories/*`
- `Data/ApplicationDbContext.cs`

## 1) Runtime and Base URL

- Development HTTP: `http://localhost:5134`
- Development HTTPS: `https://localhost:7207`
- Swagger (Development only): `GET /swagger`
- API base path: `/api`

## 2. Authentication and Session

### 2.1 Access token (JWT)

- Issued by:
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
- Send on protected routes:
  - `Authorization: Bearer <accessToken>`
- Important claim used by controllers:
  - `sub` = user id (`Guid`)
- Admin checks use role claim with `User.IsInRole("Admin")`.

### 2.2 Refresh token cookie

- Stored as HttpOnly cookie.
- Cookie name: `AuthSettings:RefreshCookieName` (fallback: `refreshToken`).
- Cookie options:
  - `HttpOnly = true`
  - `SameSite = Strict`
  - `Secure = Request.IsHttps` (true on HTTPS, false on HTTP dev)
  - `Expires = refresh token expiry`

### 2.3 Auth endpoints

- `POST /api/auth/login`
  - Public
  - Body: `LoginRequestDto`
  - Returns: `AuthTokensResponseDto`
  - Sets refresh cookie
- `POST /api/auth/register`
  - Public
  - Body: `UserRegisterDto` (`fullName`, `email`, `phoneNumber`, `password`)
  - Creates a new user account
  - Returns: `AuthTokensResponseDto`
  - Sets refresh cookie
- `POST /api/auth/refresh`
  - Public (cookie-based)
  - Returns new `AuthTokensResponseDto`
  - Rotates refresh cookie
- `POST /api/auth/logout`
  - Public
  - Revokes current refresh token if present
  - Clears refresh cookie
  - Returns `204 No Content`

## 3) CORS

- CORS policy name: `DefaultCors`
- Config source: `Cors:AllowedOrigins`
- Behavior:
  - If configured origins exist: `WithOrigins(...).AllowAnyHeader().AllowAnyMethod().AllowCredentials()`
  - If not configured: `AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()`

## 4) Serialization and Conventions

- JSON property naming: `camelCase`
- Enums are serialized as **integers**
- `Guid` values are strings
- `DateTime` values are ISO-8601
- Soft delete is used for most entities (`IsDeleted = true`) with EF global query filters

## 5) New Verification & Subscription Domain

### 5.1 `Hostel` (extended)

`Hostel` now includes:
- `OwnerId`
- `IsVerified`
- `VerifiedAt`
- `VerifiedByAdminId`
- `VerificationStatus` (`HostelVerificationStatus`)
- `Subscription` (1:1)
- `VerificationRequests` (1:many)
- `Images` (1:many, metadata + URL payload)

### 5.2 `HostelVerificationRequest`

Tracks review lifecycle:
- `HostelId`
- `RequestedByUserId`
- `Status` (`Pending/Approved/Rejected/...`)
- `AdminNotes`
- `ReviewedByAdminId`
- `ReviewedAt`

### 5.3 `HostelSubscription`

Tracks validity:
- `HostelId` (unique)
- `StartDate`
- `ExpiryDate`
- `IsActive`
- `LastReminderSentAt`

### 5.4 Verification status enum

`HostelVerificationStatus`:
- `0 = None`
- `1 = Pending`
- `2 = Approved`
- `3 = Rejected`
- `4 = Expired`

### 5.5 `HostelImage`

Each hostel can store up to **8 images**.

`HostelImage` includes:
- `id`
- `hostelId`
- `fileName`
- `contentType`
- `fileSize`
- `imageUrl`
- `displayOrder`
- `createdAt`

Storage strategy:
- Database stores metadata + `imageUrl`
- Binary file storage is handled by `IImageStorageService` (currently local `wwwroot/uploads`, Azure Blob-ready abstraction)

## 6) Background Processing

Hosted service: `SubscriptionMonitorService`
- Registered via `AddHostedService<SubscriptionMonitorService>()`
- Runs periodically every 12 hours
- Workflow (`SubscriptionService.ProcessExpirationsAndRemindersAsync`):
  - Finds active subscriptions with `ExpiryDate < UtcNow`
  - Marks subscription inactive
  - Marks hostel unverified + `VerificationStatus = Expired`
  - Sends expiry email notification
  - Sends reminder emails for active subscriptions expiring within 3 days (once per day max)

## 7) Email Service

Current `EmailService` behavior:
- `SendSubscriptionExpiredEmailAsync(ownerId, ...)`
- `SendSubscriptionExpiringSoonEmailAsync(ownerId, expiryDate, ...)`

Note: email delivery is currently logged (`ILogger`) and does not yet send via SMTP/provider.

## 8) DTO Updates

### 8.1 `HostelReadDto`

Now includes:
- `ownerId`
- `ownerName`
- `ownerEmail`
- `ownerPhoneNumber`
- `isVerified`
- `verifiedAt`
- `verifiedByAdminId`
- `verificationStatus`
- `latitude`
- `longitude`
- `googleMapsUrl`
- `images` (`List<string>`)

### 8.2 `HostelCreateDto` / `HostelUpdateDto`

Now includes:
- `ownerId`
- `latitude` / `longitude` (authoritative location)
- `googleMapsUrl` (optional convenience)
- `images` (`List<string>?`)

### 8.3 New DTOs

- `UserRegisterDto`
- `HostelVerificationRequestReadDto`
- `ReviewVerificationRequestDto`
- `HostelSubscriptionReadDto`
- `UpsertHostelSubscriptionDto`
- `HostelImageReadDto`
- `UpdateHostelImageOrderDto`
- `UniversityReadDto`, `UniversityCreateDto`, `UniversityUpdateDto`
- `HostelSearchRequestDto`, `HostelSearchWeightsDto`, `HostelSearchResultDto`
- `StudentPreferenceUpsertDto`, `StudentPreferenceReadDto`, `StudentPreferenceWeightsDto`

## 9) Endpoints

## 9.1 Users (`/api/users`)

- `GET /api/users`
- `GET /api/users/{id}`
- `POST /api/users`
- `PUT /api/users/{id}`
- `DELETE /api/users/{id}`

Delete authorization rules:
- Admin can delete any user profile.
- Student/Owner can delete only their own profile.
- Delete is a soft delete (`IsDeleted = true`).

## 9.2 Hostels (`/api/hostels`)

- `GET /api/hostels`
- `GET /api/hostels/{id}`
- `POST /api/hostels/search` (budget + amenities + university distance + weighted ranking)
- `POST /api/hostels`
- `PUT /api/hostels/{id}`
- `DELETE /api/hostels/{id}`
- `POST /api/hostels/{id}/restore`

Delete/restore lifecycle:
- `DELETE /api/hostels/{id}` performs soft delete (`IsDeleted = true`, `DeletedAt = UtcNow`)
- `POST /api/hostels/{id}/restore` restores within retention window (`IsDeleted = false`, `DeletedAt = null`)
- Deleting a hostel also soft-deletes associated `HostelImage` rows

Location behavior:
- On create/update, backend accepts either explicit `latitude`/`longitude` or a `googleMapsUrl` containing coordinates.
- If only `googleMapsUrl` is provided, coordinates are extracted and stored.
- Short links (`https://maps.app.goo.gl/...`) are resolved via HTTP redirect first, then coordinates are extracted from the resolved URL.

Search behavior (`POST /api/hostels/search`):
- Weighted score uses `price`, `distance`, `rating`.
- Request-provided `weights` are used first.
- If authenticated and `universityId` is empty, backend falls back to saved `StudentPreference.universityId`.
- If authenticated and `weights` are omitted, backend falls back to saved `StudentPreference.weights`.
- Saved budget/capacity/amenities are used as ranking preferences (soft boost), not hard filters.
- Hard filtering still occurs only when corresponding filter values are explicitly sent in the search request.
- If neither request nor saved preference provides `universityId`, request fails with `400`.

Search request body example:
```json
{
  "minBudget": 12000,
  "maxBudget": 35000,
  "genderPolicy": "Female",
  "requiredCapacity": 1,
  "universityId": "7f27fe6d-9e2c-4f36-bbaf-30bd58ac95ad",
  "amenityIds": [
    "a2ea6b48-5f69-4d2e-a478-0adc027e65bb",
    "c1c1a6a4-f44e-4171-be89-b2da5bc2bde5"
  ],
  "weights": {
    "priceWeight": 0.5,
    "distanceWeight": 0.3,
    "ratingWeight": 0.2
  }
}
```

Search request body example using saved preference fallback (authenticated user):
```json
{
  "genderPolicy": "Female"
}
```

## 9.2.1 Universities (`/api/universities`)

- `GET /api/universities`
- `GET /api/universities/{id}`
- `POST /api/universities`
- `PUT /api/universities/{id}`
- `DELETE /api/universities/{id}`

## 9.2.2 Student Preferences (`/api/student-preferences`)

- `GET /api/student-preferences/me`
  - Authenticated
  - Returns saved recommendation defaults for current user

- `PUT /api/student-preferences/me`
  - Authenticated
  - Creates or updates current user's saved recommendation defaults

`PUT /api/student-preferences/me` body (`StudentPreferenceUpsertDto`):
- `universityId` (`Guid`, required)
- `minBudget` (`decimal?`)
- `maxBudget` (`decimal?`)
- `requiredCapacity` (`int?`)
- `selectedAmenities` (`List<string>?`, amenity names)
- `priorityOrder` (`List<string>?`, must contain exactly `price`, `distance`, `rating`)
- `weights` (`StudentPreferenceWeightsDto?`)
  - `price`, `distance`, `rating`
  - If omitted, backend derives weights from `priorityOrder` as `0.5`, `0.3`, `0.2` (top to bottom)
  - If provided, backend normalizes to sum = `1.0`

Frontend payload example (from preference form):
```json
{
  "universityId": "7f27fe6d-9e2c-4f36-bbaf-30bd58ac95ad",
  "minBudget": 15000,
  "maxBudget": 40000,
  "requiredCapacity": 2,
  "selectedAmenities": ["Wifi", "Attached Bathroom", "Laundry"],
  "priorityOrder": ["distance", "price", "rating"],
  "weights": {
    "price": 0.3,
    "distance": 0.5,
    "rating": 0.2
  }
}
```

Validation rules:
- `universityId` must exist.
- `minBudget`/`maxBudget` cannot be negative.
- If both present, `minBudget <= maxBudget`.
- `requiredCapacity` must be greater than zero when provided.
- Every `selectedAmenities` value must exist in amenities table.

## 9.3 Rooms (`/api/rooms`)

- `GET /api/rooms`
- `GET /api/rooms/{id}`
- `POST /api/rooms`
- `PUT /api/rooms/{id}`
- `DELETE /api/rooms/{id}`

## 9.4 Amenities (`/api/amenities`)

- `GET /api/amenities`
- `GET /api/amenities/{id}`
- `POST /api/amenities`
- `PUT /api/amenities/{id}`
- `DELETE /api/amenities/{id}`

## 9.5 Hostel Listings (`/api/hostellistings`)

- `GET /api/hostellistings`
- `GET /api/hostellistings/{id}`
- `POST /api/hostellistings`
- `PUT /api/hostellistings/{id}`
- `DELETE /api/hostellistings/{id}`

## 9.6 Hostel Amenities (`/api/hostel-amenities`)

- `GET /api/hostel-amenities`
- `GET /api/hostel-amenities/{hostelId}/{amenityId}`
- `POST /api/hostel-amenities`
- `POST /api/hostel-amenities/by-names`
- `DELETE /api/hostel-amenities/{hostelId}/{amenityId}`

`POST /api/hostel-amenities/by-names` body (`HostelAmenityBulkCreateDto`):
- `hostelId`
- `amenityNames` (comma-separated, e.g. `"Wifi, Electricity"`)

Behavior:
- Splits by comma and trims values
- Creates missing amenities
- Links all parsed amenities to the hostel in one call

## 9.7 Interaction Events (`/api/interactionevents`)

- `GET /api/interactionevents`
- `GET /api/interactionevents/{id}`
- `POST /api/interactionevents`
- `PUT /api/interactionevents/{id}`
- `DELETE /api/interactionevents/{id}`

## 9.8 Hostel Reviews (`/api/hostels/{hostelId}/reviews`)

- Public:
  - `GET /api/hostels/{hostelId}/reviews`
  - `GET /api/hostels/{hostelId}/reviews/summary`
- Protected:
  - `POST /api/hostels/{hostelId}/reviews`
  - `PUT /api/hostels/{hostelId}/reviews/{reviewId}`
  - `DELETE /api/hostels/{hostelId}/reviews/{reviewId}`

Authorization rules:
- Review owner can update/delete own review
- Admin can update/delete any review

## 9.9 Hostel Verification

- `POST /api/hostels/{hostelId}/verification/request` (authenticated owner)
- `GET /api/hostels/{hostelId}/verification/requests` (owner of hostel or admin)
- `POST /api/verification-requests/{requestId}/approve` (admin only)
- `POST /api/verification-requests/{requestId}/reject` (admin only)

## 9.10 Hostel Subscription

- `GET /api/hostels/{hostelId}/subscription` (owner of hostel or admin)
- `PUT /api/hostels/{hostelId}/subscription` (owner of hostel or admin)

`PUT` body (`UpsertHostelSubscriptionDto`):
- `startDate`
- `expiryDate`

Validation:
- `expiryDate` must be greater than `startDate`

## 9.11 Hostel Images (`/api/hostelimages`)

- `GET /api/hostelimages/{hostelId}`
  - Public
  - Returns images ordered by `displayOrder`

- `POST /api/hostelimages/{hostelId}`
  - Authenticated
  - Body: `multipart/form-data`
    - `file` (`IFormFile`, required)
    - `displayOrder` (`int`, optional)
  - Authorization: hostel owner or admin
  - Enforces max **8 images** per hostel
  - Server-side validation:
    - Max file size: **5MB**
    - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
  - Images are resized/compressed on upload using ImageSharp and saved as WebP variants:
    - `thumbnail`: 300px max width
    - `card`: 600px max width
    - `full`: 1200px max width
  - Stored `ImageUrl` points to the `full` variant
  - CDN-ready URL support via `ImageStorage:CdnBaseUrl` configuration

- `DELETE /api/hostelimages/{imageId}`
  - Authenticated
  - Authorization: hostel owner or admin

- `PUT /api/hostelimages/{imageId}/order`
  - Authenticated
  - Body: `UpdateHostelImageOrderDto`
  - Authorization: hostel owner or admin

## 10) Error Shape

Domain exceptions are returned as problem details (`application/problem+json`) via middleware.

Common fields:
- `status`
- `title`
- `detail`
- `instance`
- `errorCode` (when available)

Common statuses:
- `200`, `201`, `204`
- `400` (validation/business rules)
- `401` (unauthorized)
- `403` (forbidden)
- `404` (not found)
- `409` (conflict)
- `500` (unhandled)

## 11) Notes

- Data access is repository-driven for key modules (Auth, Hostels, HostelReviews, Verification, Subscription).
- `HostelImage` now stores metadata + `ImageUrl` and is designed for seamless migration from local file storage to Azure Blob storage by replacing `IImageStorageService` implementation only.
- Soft-delete lifecycle now includes `DeletedAt` on entities.
- `CleanupDeletedDataService` runs on a schedule and permanently deletes hostels past retention (default 60 days), including storage image cleanup.
- Cleanup settings:
  - `DataCleanup:RetentionDays` (default `60`)
  - `DataCleanup:RunIntervalHours` (default `24`)
