# Hostel Management System Backend API Documentation

Last updated from source code: 2026-02-23

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
- `isVerified`
- `verifiedAt`
- `verifiedByAdminId`
- `verificationStatus`
- `images` (`List<string>`)

### 8.2 `HostelCreateDto` / `HostelUpdateDto`

Now includes:
- `ownerId`
- `images` (`List<string>?`)

### 8.3 New DTOs

- `HostelVerificationRequestReadDto`
- `ReviewVerificationRequestDto`
- `HostelSubscriptionReadDto`
- `UpsertHostelSubscriptionDto`
- `HostelImageReadDto`
- `UpdateHostelImageOrderDto`

## 9) Endpoints

## 9.1 Users (`/api/users`)

- `GET /api/users`
- `GET /api/users/{id}`
- `POST /api/users`
- `PUT /api/users/{id}`
- `DELETE /api/users/{id}`

## 9.2 Hostels (`/api/hostels`)

- `GET /api/hostels`
- `GET /api/hostels/{id}`
- `POST /api/hostels`
- `PUT /api/hostels/{id}`
- `DELETE /api/hostels/{id}`

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
- `DELETE /api/hostel-amenities/{hostelId}/{amenityId}`

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
